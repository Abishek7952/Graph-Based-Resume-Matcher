from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from passlib.context import CryptContext
from neo4j import GraphDatabase
import google.generativeai as genai
import fitz  # PyMuPDF
import os
import json
from dotenv import load_dotenv
import tempfile
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
    version="3.5"
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
            job_title = job.get("job_description", "Unknown Job")
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
            name = resume.get("name", "Unknown")
            skills = resume.get("skills", [])

            session.run("""
                MERGE (r:Resume {id:$resume_id})
                SET r.name=$name
            """, resume_id=resume_id, name=name)

            for skill in skills:
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

        recommendations = []
        for record in result:
            recommendations.append({
                "job_id": record["job_id"],
                "job_title": record["job_title"],
                "matchedSkills": record["matchedSkills"]
            })
    return recommendations


def eligible_applicants(job_id):
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (j:Job {id:$job_id})-[:REQUIRES]->(s:Skill)<-[:HAS]-(r:Resume)
            RETURN r.id AS resume_id, r.name AS resume_name, count(s) AS matchedSkills
            ORDER BY matchedSkills DESC
        """, job_id=job_id)
        applicants = []
        for record in result:
            applicants.append({
                "resume_id": record["resume_id"],
                "resume_name": record["resume_name"],
                "matchedSkills": record["matchedSkills"]
            })
    return applicants

# ---------------------------------------------------------------------------
# 4️⃣ Authentication (Signup / Login)
# ---------------------------------------------------------------------------

@app.post("/signup/")
def signup(username: str = Form(...), password: str = Form(...)):
    try:
        existing = db["users"].find_one({"username": username})
        if existing:
            return JSONResponse(content={"status": "failed", "message": "User already exists"}, status_code=400)

        # Hash the full password safely (no truncation)
        hashed_pwd = pwd_context.hash(password)
        db["users"].insert_one({"username": username, "password": hashed_pwd})
        return {"status": "success", "message": "User registered successfully"}
    except Exception as e:
        import traceback
        return JSONResponse(content={"status": "error", "details": str(e), "trace": traceback.format_exc()}, status_code=500)


@app.post("/login/")
def login(username: str = Form(...), password: str = Form(...)):
    """User login: admin → /extract_jd_skills, others → /parse_resume."""
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

def parse_resume_with_gemini(pdf_path: str):
    try:
        doc = fitz.open(pdf_path)
        raw_text = "".join(page.get_text() for page in doc)
        doc.close()
        if not raw_text.strip():
            return {"error": "No extractable text found in PDF"}
    except Exception as e:
        return {"error": f"Failed to extract text: {e}"}

    prompt = f"""
    Act as an expert resume parser. Analyze the text below and return a structured JSON object.
    JSON must include: name, email, phone, skills (list), work_experience, projects, summary.
    Resume:
    ---
    {raw_text}
    ---
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        json_text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(json_text)
    except Exception as e:
        return {"error": str(e)}


@app.post("/parse_resume/")
async def parse_resume(file: UploadFile = File(...)):
    """User uploads resume -> parse -> save -> sync Neo4j -> return recommended jobs"""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        parsed_data = parse_resume_with_gemini(tmp_path)
        if "error" in parsed_data:
            return JSONResponse(content={"status": "failed", "error": parsed_data["error"]}, status_code=400)

        result = db["resumes"].insert_one(parsed_data)
        parsed_data["_id"] = str(result.inserted_id)
        os.remove(tmp_path)

        push_resumes_to_neo4j()
        print("✅ Done pushing resume data to Neo4j")

        # Get recommended jobs for this resume
        recs = recommend_jobs(str(parsed_data["_id"]))

        return {"status": "success", "data": parsed_data, "recommendations": recs}
    except Exception as e:
        return JSONResponse(content={"status": "failed", "error": str(e)}, status_code=500)

# ---------------------------------------------------------------------------
# 6️⃣ Job Description Skill Extraction (Gemini + MongoDB + Neo4j)
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
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()
        start = text.find("{")
        end = text.rfind("}") + 1
        json_str = text[start:end] if start != -1 else "{}"
        data = json.loads(json_str)
        return data.get("skills", [])
    except Exception as e:
        return {"error": str(e)}


@app.post("/extract_jd_skills/")
async def extract_jd_skills(job_description: str = Form(...)):
    """Recruiter posts JD -> extract skills -> save -> sync Neo4j -> return eligible applicants"""
    try:
        skills = extract_skills_with_gemini(job_description)
        if isinstance(skills, dict) and "error" in skills:
            return JSONResponse(content={"status": "failed", "error": skills["error"]}, status_code=400)

        doc = {"job_description": job_description.strip(), "skills": skills}
        result = db["JD_skills"].insert_one(doc)
        doc["_id"] = str(result.inserted_id)

        push_jobs_to_neo4j()
        print("✅ Done pushing JD data to Neo4j")

        # Get eligible applicants from Neo4j
        applicants = eligible_applicants(str(doc["_id"]))

        return {"status": "success", "data": doc, "applicants": applicants}
    except Exception as e:
        return JSONResponse(content={"status": "failed", "error": str(e)}, status_code=500)

# ---------------------------------------------------------------------------
# 7️⃣ Public Endpoints for Frontend
# ---------------------------------------------------------------------------

@app.get("/recommend_jobs/")
def get_recommendations(resume_id: str):
    recs = recommend_jobs(resume_id)
    return {"recommendations": recs}


@app.get("/eligible_applicants/")
def get_eligible_applicants(job_id: str):
    applicants = eligible_applicants(job_id)
    return {"applicants": applicants}

# ---------------------------------------------------------------------------
# 8️⃣ Root Endpoint
# ---------------------------------------------------------------------------

@app.get("/")
def home():
    return {"message": "🚀 Resume & JD Analyzer API with Neo4j Recommendations Ready!"}

# ---------------------------------------------------------------------------
# Run:
# uvicorn main:app --reload
# ---------------------------------------------------------------------------
