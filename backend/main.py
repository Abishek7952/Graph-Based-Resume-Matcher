from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from pymongo import MongoClient
import gridfs
from bson.objectid import ObjectId
from fastapi.middleware.cors import CORSMiddleware
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
# 3️⃣ Helper Functions — Normalization & Neo4j Sync Logic
# ---------------------------------------------------------------------------

def normalize_parsed_resume(parsed):
    """
    Normalize different possible Gemini outputs into a consistent schema:
    returns dict with keys:
      - name (str)
      - email (str)
      - phone (str)
      - summary (str)
      - skills (list[str])
      - professional_experience (list[dict]) each with title/company/dates/responsibilities(list)
      - projects (list[dict]) each with title/details(list)
      - personal_information (dict) - optional original-style wrapper
      - parsed_raw (original parsed dict) - kept for debugging
    This function is defensive and tolerant of many input shapes.
    """
    try:
        if not isinstance(parsed, dict):
            return {"error": "parsed is not a dict", "parsed_raw": parsed}

        out = {}
        out['parsed_raw'] = parsed  # keep original for debugging

        # --- Name/email/phone extraction ---
        name = parsed.get("name") or parsed.get("full_name") or None

        personal = parsed.get("personal_information") or parsed.get("personalInfo") or parsed.get("personal") or {}
        email = parsed.get("email") or ""
        phone = parsed.get("phone") or ""

        if isinstance(personal, dict):
            if not name:
                name = personal.get("name") or personal.get("full_name")
            contact = personal.get("contact_details") or personal.get("contact") or {}
            if isinstance(contact, dict):
                email = email or contact.get("email") or ""
                phone = phone or contact.get("phone") or ""

        # fallback searches
        if not email:
            def find_email(obj):
                if isinstance(obj, str):
                    if "@" in obj and "." in obj.split("@")[-1]:
                        return obj
                if isinstance(obj, dict):
                    for v in obj.values():
                        e = find_email(v)
                        if e:
                            return e
                if isinstance(obj, list):
                    for item in obj:
                        e = find_email(item)
                        if e:
                            return e
                return None
            email = find_email(parsed) or ""

        if not phone:
            def find_phone(obj):
                if isinstance(obj, str):
                    digits = "".join(ch for ch in obj if ch.isdigit())
                    if 7 <= len(digits) <= 15:
                        return obj
                if isinstance(obj, dict):
                    for v in obj.values():
                        p = find_phone(v)
                        if p:
                            return p
                if isinstance(obj, list):
                    for item in obj:
                        p = find_phone(item)
                        if p:
                            return p
                return None
            phone = find_phone(parsed) or ""

        out['name'] = name or ""
        out['email'] = email or ""
        out['phone'] = phone or ""

        # --- Summary / career objective ---
        summary = parsed.get("summary") or parsed.get("career_objective") or parsed.get("objective") or ""
        if not summary and isinstance(personal, dict):
            summary = personal.get("summary") or personal.get("career_objective") or ""
        out['summary'] = summary or ""

        # --- Skills --- normalize to list[str]
        skills = []
        raw_skills = parsed.get("skills") or parsed.get("skillset") or parsed.get("technical_skills") or {}
        if isinstance(raw_skills, dict):
            for v in raw_skills.values():
                if isinstance(v, list):
                    skills.extend([str(x).strip() for x in v if x])
                elif isinstance(v, str):
                    skills.extend([s.strip() for s in v.split(",") if s.strip()])
        elif isinstance(raw_skills, list):
            for s in raw_skills:
                if isinstance(s, str):
                    skills.append(s.strip())
                elif isinstance(s, dict):
                    skills.append(s.get("name") or s.get("skill") or str(s))
                else:
                    skills.append(str(s))
        elif isinstance(raw_skills, str):
            skills = [s.strip() for s in raw_skills.split(",") if s.strip()]

        seen = set()
        clean_skills = []
        for s in skills:
            key = s.lower()
            if key not in seen and s:
                seen.add(key)
                clean_skills.append(s)
        out['skills'] = clean_skills

        # --- Professional Experience normalization ---
        pro = parsed.get("professional_experience") or parsed.get("work_experience") or parsed.get("experience") or []
        normalized_exp = []
        if isinstance(pro, dict):
            for k, v in pro.items():
                if isinstance(v, dict):
                    normalized_exp.append({
                        "title": v.get("title") or v.get("role") or "",
                        "company": k,
                        "dates": v.get("dates") or v.get("duration") or "",
                        "responsibilities": v.get("responsibilities") or v.get("responsibility") or v.get("tasks") or []
                    })
                elif isinstance(v, list):
                    for ent in v:
                        if isinstance(ent, dict):
                            normalized_exp.append({
                                "title": ent.get("title") or ent.get("role") or "",
                                "company": k,
                                "dates": ent.get("dates") or ent.get("duration") or "",
                                "responsibilities": ent.get("responsibilities") or ent.get("tasks") or []
                            })
        elif isinstance(pro, list):
            for item in pro:
                if isinstance(item, dict):
                    title = item.get("title") or item.get("role") or item.get("position") or ""
                    company = item.get("company") or item.get("employer") or ""
                    dates = item.get("dates") or item.get("duration") or item.get("period") or ""
                    resp = item.get("responsibilities") or item.get("responsibility") or item.get("tasks") or item.get("description") or []
                    if isinstance(resp, str):
                        resp = [r.strip() for r in resp.split(".") if r.strip()]
                    normalized_exp.append({
                        "title": title,
                        "company": company,
                        "dates": dates,
                        "responsibilities": resp if isinstance(resp, list) else [str(resp)]
                    })
                elif isinstance(item, str):
                    normalized_exp.append({
                        "title": "",
                        "company": "",
                        "dates": "",
                        "responsibilities": [item]
                    })
        out['professional_experience'] = normalized_exp

        # --- Projects normalization ---
        proj = parsed.get("projects") or parsed.get("personal_projects") or parsed.get("project") or []
        normalized_projects = []
        if isinstance(proj, dict):
            for pname, pdetail in proj.items():
                if isinstance(pdetail, dict):
                    details = pdetail.get("details") or pdetail.get("description") or pdetail.get("points") or []
                    if isinstance(details, str):
                        details = [d.strip() for d in details.split(".") if d.strip()]
                    normalized_projects.append({
                        "title": pname,
                        "details": details if isinstance(details, list) else [str(details)]
                    })
        elif isinstance(proj, list):
            for p in proj:
                if isinstance(p, dict):
                    title = p.get("title") or p.get("name") or ""
                    details = p.get("details") or p.get("description") or p.get("points") or []
                    if isinstance(details, str):
                        details = [d.strip() for d in details.split(".") if d.strip()]
                    normalized_projects.append({
                        "title": title,
                        "details": details if isinstance(details, list) else [str(details)]
                    })
                elif isinstance(p, str):
                    normalized_projects.append({"title": p, "details": []})
        out['projects'] = normalized_projects

        out['personal_information'] = personal if isinstance(personal, dict) else {}

        return out
    except Exception:
        traceback.print_exc()
        return {"error": "normalization_failed", "parsed_raw": parsed}


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
            resume_id = str(resume.get("_id"))
            file_id = resume.get("gridfs_file_id", "")

            # prefer normalized fields when available
            name = resume.get("name") or resume.get("parsed_raw", {}).get("name") or "Unknown"
            email = resume.get("email") or resume.get("parsed_raw", {}).get("email") or "N/A"
            phone = resume.get("phone") or resume.get("parsed_raw", {}).get("phone") or "N/A"
            summary = resume.get("summary") or resume.get("parsed_raw", {}).get("summary") or "No summary available."

            skills = resume.get("skills") or []
            if isinstance(skills, dict):
                flat_skills = []
                for skill_list in skills.values():
                    if isinstance(skill_list, list):
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
    print("✅ Resumes (with corrected flat details) pushed to Neo4j.")


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
            job_id = record["job_id"]
            job_doc = db["JD_skills"].find_one({"_id": ObjectId(job_id)})

            recommendations.append({
                "job_id": job_id,
                "job_title": record["job_title"],
                "matchedSkills": record["matchedSkills"],
                "company_portal_link": job_doc.get("company_portal_link", "") if job_doc else "",
                "skills": job_doc.get("skills", []) if job_doc else []
            })
    return recommendations



def eligible_applicants(job_id):
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (j:Job {id:$job_id})-[:REQUIRES]->(s:Skill)<-[:HAS]-(r:Resume)
            RETURN r.id AS resume_id, r.name AS resume_name, r.file_id AS file_id, 
                   r.email AS email, r.phone AS phone, r.summary AS summary, 
                   count(s) AS matchedSkills
            ORDER BY matchedSkills DESC
        """, job_id=job_id)
        applicants = []
        for record in result:
            applicants.append({
                "resume_id": record["resume_id"],
                "resume_name": record["resume_name"],
                "file_id": record["file_id"],
                "email": record["email"],
                "phone": record["phone"],
                "summary": record["summary"],
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

        hashed_pwd = pwd_context.hash(password)
        db["users"].insert_one({"username": username, "password": hashed_pwd})
        return {"status": "success", "message": "User registered successfully"}
    except Exception as e:
        traceback.print_exc()
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
    """
    Reads a PDF file and asks Gemini to produce structured JSON.
    Returns either a dict (parsed JSON) or {'error': '...'} on failure.
    """
    try:
        doc = fitz.open(pdf_path)
        raw_text = "".join(page.get_text() for page in doc)
        doc.close()
        if not raw_text.strip():
            return {"error": "No extractable text found in PDF"}
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Failed to extract text: {e}"}

    prompt = f"""
Act as an expert resume parser. Analyze the text below and return a structured JSON object.
The JSON structure should include (but adapt if necessary):
- "personal_information": {{ "name": "...", "contact_details": {{ "email": "...", "phone": "..." }} }}
- "career_objective": "..."
- "skills": {{ "languages": [...], "frameworks": [...], "tools": [...] }} OR a flat list ["Python","SQL",...]
- "professional_experience": [{{ "title": "...", "company": "...", "dates": "...", "responsibilities": [...] }}]
- "projects": [{{ "title": "...", "details": [...] }}]

Resume Text:
---
{raw_text}
---

Return only valid JSON. If a field is missing, you may omit it. Make the structure JSON-first so it can be parsed programmatically.
"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        json_text = response.text.strip()
        json_text = json_text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(json_text)
        return parsed
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Gemini parse failed: {str(e)}"}


@app.post("/parse_resume/")
async def parse_resume(file: UploadFile = File(...), username: str = Form(...)):
    """
    User uploads resume -> parse -> save with username -> sync -> return recommendations.
    The resume is persistent for each user even after logout or server restart.
    """
    try:
        file_content = await file.read()

        with fitz.open(stream=file_content, filetype="pdf") as doc:
            raw_text = "".join(page.get_text() for page in doc)
            if not raw_text.strip():
                return JSONResponse(
                    content={"status": "failed", "error": "No text in PDF"},
                    status_code=400
                )

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

        # Save the resume file to GridFS
        file_id = fs.put(file_content, filename=file.filename)
        parsed_data['gridfs_file_id'] = str(file_id)

        # ✅ Associate resume with the logged-in username
        parsed_data['username'] = username

        # Remove any previous resume from this user (optional)
        existing = db["resumes"].find_one({"username": username})
        if existing:
            db["resumes"].delete_one({"username": username})
            try:
                if existing.get("gridfs_file_id"):
                    fs.delete(ObjectId(existing["gridfs_file_id"]))
            except Exception:
                pass

        # Insert the new parsed resume
        result = db["resumes"].insert_one(parsed_data)
        parsed_data['_id'] = str(result.inserted_id)
        resume_id = str(result.inserted_id)

        # Push resume to Neo4j for recommendations
        push_resumes_to_neo4j()

        # Get job recommendations
        with neo4j_driver.session() as session:
            recs_result = session.run("""
                MATCH (r:Resume {id:$resume_id})-[:HAS]->(s:Skill)<-[:REQUIRES]-(j:Job)
                RETURN j.id AS job_id, j.title AS title, j.link AS company_portal_link, count(s) AS matchedSkills
                ORDER BY matchedSkills DESC
                LIMIT 5
            """, resume_id=resume_id)

            recommendations = []
            for record in recs_result:
                job_doc = db["JD_skills"].find_one({"_id": ObjectId(record["job_id"])})
                if job_doc:
                    recommendations.append({
                        "job_id": str(job_doc["_id"]),
                        "job_title": job_doc.get("job_title", "Untitled Job"),
                        "company_portal_link": job_doc.get("company_portal_link", ""),
                        "skills": job_doc.get("skills", []),
                        "matchedSkills": record["matchedSkills"]
                    })

        return {"status": "success", "data": parsed_data, "recommendations": recommendations}

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={"status": "failed", "error": str(e)},
            status_code=500
        )



@app.get("/my_resume/")
def get_my_resume(username: str):
    """Return saved resume for this username (if any)."""
    try:
        doc = db["resumes"].find_one({"username": username})
        if not doc:
            return {"found": False}
        doc_copy = dict(doc)
        doc_copy["_id"] = str(doc.get("_id"))
        return {"found": True, "data": doc_copy}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(content={"status": "failed", "error": str(e)}, status_code=500)


@app.delete("/my_resume/")
def delete_my_resume(username: str):
    """Delete saved resume and GridFS file for a username."""
    try:
        doc = db["resumes"].find_one({"username": username})
        if not doc:
            return {"status": "failed", "message": "No resume found"}

        try:
            if doc.get("gridfs_file_id"):
                fs.delete(ObjectId(doc["gridfs_file_id"]))
        except Exception:
            pass

        db["resumes"].delete_one({"_id": doc["_id"]})
        try:
            push_resumes_to_neo4j()
        except Exception:
            traceback.print_exc()
        return {"status": "success", "message": "Resume deleted"}
    except Exception as e:
        traceback.print_exc()
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
        model = genai.GenerativeModel(
            "gemini-2.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )
        response = model.generate_content(prompt)
        text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(text)
        return data.get("skills", [])
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}


@app.post("/extract_jd_skills/")
async def extract_jd_skills(
    job_description: str = Form(...),
    job_title: str = Form(...),
    company_portal_link: str = Form(...)
):
    """
    Recruiter posts JD -> extract skills -> save -> sync Neo4j -> return eligible applicants
    Ensures job_title and company_portal_link are saved and visible in frontend.
    """
    try:
        # Extract key skills using Gemini
        skills = extract_skills_with_gemini(job_description)
        if isinstance(skills, dict) and "error" in skills:
            return JSONResponse(content={"status": "failed", "error": skills["error"]}, status_code=400)

        # Prepare JD document for MongoDB
        doc = {
            "job_title": job_title.strip(),
            "company_portal_link": company_portal_link.strip(),
            "job_description": job_description.strip(),
            "skills": skills
        }

        # Save to MongoDB
        result = db["JD_skills"].insert_one(doc)
        doc["_id"] = str(result.inserted_id)

        # Sync to Neo4j with proper job_title field
        with neo4j_driver.session() as session:
            session.run("""
                MERGE (j:Job {id:$job_id})
                SET j.title=$job_title, j.link=$company_portal_link
            """, job_id=str(result.inserted_id),
                 job_title=job_title.strip(),
                 company_portal_link=company_portal_link.strip())

            for skill in skills:
                session.run("MERGE (s:Skill {name:$skill})", skill=skill)
                session.run("""
                    MATCH (j:Job {id:$job_id}), (s:Skill {name:$skill})
                    MERGE (j)-[:REQUIRES]->(s)
                """, job_id=str(result.inserted_id), skill=skill)

        print(f"✅ JD pushed to Neo4j: {job_title}")

        # Find eligible applicants based on skills
        applicants = eligible_applicants(str(result.inserted_id))

        # Return complete JD info and matched applicants
        return {
            "status": "success",
            "data": {
                "_id": str(result.inserted_id),
                "job_title": job_title.strip(),
                "company_portal_link": company_portal_link.strip(),
                "job_description": job_description.strip(),
                "skills": skills
            },
            "applicants": applicants
        }

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={"status": "failed", "error": str(e)},
            status_code=500
        )



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


@app.get("/download_resume/{file_id}")
def download_resume(file_id: str):
    """Retrieves a resume from GridFS and streams it for download."""
    try:
        gridfs_file = fs.get(ObjectId(file_id))
        return StreamingResponse(gridfs_file, media_type='application/pdf', 
                                 headers={"Content-Disposition": f"attachment; filename=\"{gridfs_file.filename}\""})
    except gridfs.errors.NoFile:
        return JSONResponse(content={"error": "File not found"}, status_code=404)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

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
