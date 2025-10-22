from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import gridfs
from bson.objectid import ObjectId
from passlib.context import CryptContext
from neo4j import GraphDatabase
import google.generativeai as genai
import fitz  # PyMuPDF
import os
import json
from dotenv import load_dotenv
import traceback

# ---------------------------------------------------------------------------
# 1️⃣ Load environment & configure Gemini + MongoDB + Neo4j
# ---------------------------------------------------------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise Exception("❌ Missing GEMINI_API_KEY in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

# MongoDB Config
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["Resume_Matcher"]
fs = gridfs.GridFS(db)

# Neo4j Config
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "vishal2004")
neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# 2️⃣ Initialize FastAPI + CORS
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Resume & JD Analyzer API with Neo4j Integration",
    description="FastAPI + Gemini + MongoDB + Neo4j Integration",
    version="3.6"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 3️⃣ Helper Functions — Neo4j Sync Logic
# ---------------------------------------------------------------------------

def push_jobs_to_neo4j():
    jobs = list(db["JD_skills"].find())
    with neo4j_driver.session() as session:
        for job in jobs:
            job_id = str(job["_id"])
            job_title = job.get("job_title", "Unknown Job")
            skills = job.get("skills", [])

            session.run("""
                MERGE (j:Job {id:$job_id})
                SET j.title=$job_title
            """, job_id=job_id, job_title=job_title)

            for skill in skills:
                session.run("MERGE (s:Skill {name:$skill})", skill=skill)
                session.run("""
                    MATCH (j:Job {id:$job_id}), (s:Skill {name:$skill})
                    MERGE (j)-[:REQUIRES]->(s)
                """, job_id=job_id, skill=skill)
    print("✅ Jobs pushed to Neo4j.")


def push_resumes_to_neo4j():
    resumes = list(db["resumes"].find())
    with neo4j_driver.session() as session:
        for resume in resumes:
            resume_id = str(resume["_id"])
            file_id = resume.get("gridfs_file_id", "")
            name = resume.get("name", "Unknown")
            email = resume.get("email", "N/A")
            phone = resume.get("phone", "N/A")
            summary = resume.get("summary", "No summary available.")
            skills = resume.get("skills", [])

            if isinstance(skills, dict):
                flat_skills = []
                for skill_list in skills.values():
                    flat_skills.extend(skill_list)
                skills = flat_skills

            session.run("""
                MERGE (r:Resume {id:$resume_id})
                SET r.name=$name, r.file_id=$file_id, r.email=$email, r.phone=$phone, r.summary=$summary
            """, resume_id=resume_id, name=name, file_id=file_id, email=email, phone=phone, summary=summary)

            for skill in skills:
                if isinstance(skill, str):
                    session.run("MERGE (s:Skill {name:$skill})", skill=skill)
                    session.run("""
                        MATCH (r:Resume {id:$resume_id}), (s:Skill {name:$skill})
                        MERGE (r)-[:HAS]->(s)
                    """, resume_id=resume_id, skill=skill)
    print("✅ Resumes pushed to Neo4j.")


def recommend_jobs(resume_id, limit=5):
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (r:Resume {id:$resume_id})-[:HAS]->(s:Skill)<-[:REQUIRES]-(j:Job)
            RETURN j.id AS job_id, j.title AS job_title, count(s) AS matchedSkills
            ORDER BY matchedSkills DESC
            LIMIT $limit
        """, resume_id=resume_id, limit=limit)
        return [
            {"job_id": record["job_id"], "job_title": record["job_title"], "matchedSkills": record["matchedSkills"]}
            for record in result
        ]

# ---------------------------------------------------------------------------
# 4️⃣ Authentication (Signup / Login)
# ---------------------------------------------------------------------------

@app.post("/signup/")
def signup(username: str = Form(...), password: str = Form(...)):
    try:
        existing = db["users"].find_one({"username": username})
        if existing:
            return JSONResponse(content={"status": "failed", "message": "User already exists"}, status_code=400)
        hashed_pwd = pwd_context.hash(password)
        db["users"].insert_one({"username": username, "password": hashed_pwd})
        return {"status": "success", "message": "User registered successfully"}
    except Exception as e:
        return JSONResponse(content={"status": "error", "details": str(e)}, status_code=500)


@app.post("/login/")
def login(username: str = Form(...), password: str = Form(...)):
    if username == "admin" and password == "admin":
        return {"status": "success", "role": "admin", "redirect": "/extract_jd_skills"}

    user = db["users"].find_one({"username": username})
    if not user:
        return JSONResponse(content={"status": "failed", "message": "User not found"}, status_code=401)
    if not pwd_context.verify(password, user["password"]):
        return JSONResponse(content={"status": "failed", "message": "Invalid password"}, status_code=401)
    return {"status": "success", "role": "user", "redirect": "/parse_resume"}


# ---------------------------------------------------------------------------
# 5️⃣ Resume Parsing (Gemini + MongoDB + Neo4j)
# ---------------------------------------------------------------------------

@app.post("/parse_resume/")
async def parse_resume(file: UploadFile = File(...)):
    """User uploads resume -> parse -> save to GridFS -> sync -> return recommendations"""
    try:
        # 1️⃣ Read and extract text from uploaded PDF
        file_content = await file.read()
        with fitz.open(stream=file_content, filetype="pdf") as doc:
            raw_text = "".join(page.get_text() for page in doc)
            if not raw_text.strip():
                return JSONResponse(content={"status": "failed", "error": "No text in PDF"}, status_code=400)

        # 2️⃣ Generate parsed resume data using Gemini
        prompt = f"""Act as an expert resume parser. Analyze the text below and return a structured JSON object.
        JSON must include: name, email, phone, skills (list), work_experience, projects, summary.
        Resume:\n---\n{raw_text}\n---"""

        model = genai.GenerativeModel(
            "gemini-2.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )

        safety_settings = {
            'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
            'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
            'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
            'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE'
        }

        response = model.generate_content(prompt, safety_settings=safety_settings)
        parsed_data = json.loads(response.text)

        # 3️⃣ Save resume file in GridFS
        file_id = fs.put(file_content, filename=file.filename)
        parsed_data['gridfs_file_id'] = str(file_id)

        # 4️⃣ Insert parsed resume into MongoDB
        result = db["resumes"].insert_one(parsed_data)
        parsed_data['_id'] = str(result.inserted_id)
        resume_id = str(result.inserted_id)

        # 5️⃣ Push resume to Neo4j and get job recommendations
        push_resumes_to_neo4j()
        print("✅ Resume pushed to Neo4j")

        # 6️⃣ Find matching jobs in Neo4j
        matched_jobs = []
        with neo4j_driver.session() as session:
            result = session.run("""
                MATCH (r:Resume {id:$resume_id})-[:HAS]->(s:Skill)<-[:REQUIRES]-(j:Job)
                RETURN j.id AS job_id, j.title AS job_title, count(s) AS matchedSkills
                ORDER BY matchedSkills DESC
            """, resume_id=resume_id)

            for record in result:
                # Fetch complete JD details from MongoDB using job_id
                job_data = db["JD_skills"].find_one({"_id": ObjectId(record["job_id"])})
                if job_data:
                    matched_jobs.append({
                        "job_id": record["job_id"],
                        "job_title": job_data.get("job_title", "Unknown Job"),
                        "company_portal_link": job_data.get("company_portal_link", ""),
                        "job_description": job_data.get("job_description", ""),
                        "skills": job_data.get("skills", []),
                        "matchedSkills": record["matchedSkills"]
                    })

        # 7️⃣ Return parsed resume + enriched job recommendations
        return {
            "status": "success",
            "data": parsed_data,
            "recommendations": matched_jobs
        }

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(content={"status": "failed", "error": str(e)}, status_code=500)


# ---------------------------------------------------------------------------
# 6️⃣ Job Description Skill Extraction (Added job_title & portal_link)
# ---------------------------------------------------------------------------

def extract_skills_with_gemini(job_description: str):
    prompt = f"""
    You are an expert career analyst. Extract all technical and soft skills from the job description.
    ---
    {job_description}
    ---
    Output JSON: {{ "skills": [ "Python", "SQL", ... ] }}
    """
    try:
        model = genai.GenerativeModel(
            "gemini-2.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )
        response = model.generate_content(prompt)
        data = json.loads(response.text)
        return data.get("skills", [])
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}


@app.post("/extract_jd_skills/")
async def extract_jd_skills(
    job_description: str = Form(...),
    job_title: str = Form(...),
    company_portal_link: str = Form(None)
):
    try:
        # 1️⃣ Extract skills from JD using Gemini
        skills = extract_skills_with_gemini(job_description)
        if isinstance(skills, dict) and "error" in skills:
            return JSONResponse(content={"status": "failed", "error": skills["error"]}, status_code=400)

        # 2️⃣ Build JD document to insert into MongoDB
        doc = {
            "job_title": job_title.strip(),
            "company_portal_link": company_portal_link.strip() if company_portal_link else "",
            "job_description": job_description.strip(),
            "skills": skills,
        }

        # 3️⃣ Insert JD document
        result = db["JD_skills"].insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        job_id = str(result.inserted_id)

        # 4️⃣ Push JD → Neo4j
        push_jobs_to_neo4j()
        print("✅ JD pushed to Neo4j")

        # 5️⃣ Find matching resumes using Neo4j relationships
        applicants = []
        with neo4j_driver.session() as session:
            neo4j_result = session.run("""
                MATCH (j:Job {id:$job_id})-[:REQUIRES]->(s:Skill)<-[:HAS]-(r:Resume)
                RETURN r.id AS resume_id, r.name AS resume_name, r.file_id AS file_id, 
                       r.email AS email, r.phone AS phone, r.summary AS summary, 
                       count(s) AS matchedSkills
                ORDER BY matchedSkills DESC
            """, job_id=job_id)

            for record in neo4j_result:
                applicants.append({
                    "resume_id": record["resume_id"],
                    "resume_name": record["resume_name"],
                    "file_id": record["file_id"],
                    "email": record["email"],
                    "phone": record["phone"],
                    "summary": record["summary"],
                    "matchedSkills": record["matchedSkills"],
                    # ✅ include JD info for frontend display
                    "job_title": doc["job_title"],
                    "company_portal_link": doc["company_portal_link"],
                })

        # 6️⃣ Return final structured response
        return {
            "status": "success",
            "data": doc,              # the inserted JD itself
            "applicants": applicants  # resumes matched to this JD
        }

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(content={"status": "failed", "error": str(e)}, status_code=500)


# ---------------------------------------------------------------------------
# 7️⃣ Download Resume Endpoint
# ---------------------------------------------------------------------------

@app.get("/download_resume/{file_id}")
def download_resume(file_id: str):
    """Retrieve resume from GridFS"""
    try:
        gridfs_file = fs.get(ObjectId(file_id))
        return StreamingResponse(
            gridfs_file,
            media_type='application/pdf',
            headers={"Content-Disposition": f"attachment; filename=\"{gridfs_file.filename}\""}
        )
    except gridfs.errors.NoFile:
        return JSONResponse(content={"error": "File not found"}, status_code=404)


# ---------------------------------------------------------------------------
# 8️⃣ Root Endpoint
# ---------------------------------------------------------------------------

@app.get("/")
def home():
    return {"message": "🚀 Resume & JD Analyzer API with Neo4j Recommendations Ready!"}


# ---------------------------------------------------------------------------
# Run: uvicorn main:app --reload
# ---------------------------------------------------------------------------
