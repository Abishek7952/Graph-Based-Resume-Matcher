from pymongo import MongoClient
from neo4j import GraphDatabase
import json

# --- MongoDB Config ---
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "Resume_Matcher"
JOBS_COLLECTION = "JD_skills"        # job descriptions with skills
RESUMES_COLLECTION = "resumes"  # resumes with extracted skills

# --- Neo4j Config ---
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "vishal2004"

# --- Connect to MongoDB ---
mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]

# --- Connect to Neo4j ---
neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


# --- Function to Push Jobs and Skills to Neo4j ---
def push_jobs_to_neo4j():
    jobs = list(db[JOBS_COLLECTION].find())
    with neo4j_driver.session() as session:
        for job in jobs:
            job_id = str(job["_id"])
            job_title = job.get("title", "Unknown")
            skills = job.get("skills", [])

            # Create Job node
            session.run("""
                MERGE (j:Job {id:$job_id})
                SET j.title=$job_title
            """, job_id=job_id, job_title=job_title)

            # Create Skill nodes and relationships
            for skill in skills:
                session.run("""
                    MERGE (s:Skill {name:$skill})
                """, skill=skill)

                session.run("""
                    MATCH (j:Job {id:$job_id}), (s:Skill {name:$skill})
                    MERGE (j)-[:REQUIRES]->(s)
                """, job_id=job_id, skill=skill)
    print("✅ Jobs pushed to Neo4j.")


# --- Function to Push Resumes and Skills to Neo4j ---
def push_resumes_to_neo4j():
    resumes = list(db[RESUMES_COLLECTION].find())
    with neo4j_driver.session() as session:
        for resume in resumes:
            resume_id = str(resume["_id"])
            name = resume.get("name", "Unknown")
            skills = resume.get("skills", [])

            # Create Resume node
            session.run("""
                MERGE (r:Resume {id:$resume_id})
                SET r.name=$name
            """, resume_id=resume_id, name=name)

            # Create Skill nodes and relationships
            for skill in skills:
                session.run("""
                    MERGE (s:Skill {name:$skill})
                """, skill=skill)

                session.run("""
                    MATCH (r:Resume {id:$resume_id}), (s:Skill {name:$skill})
                    MERGE (r)-[:HAS]->(s)
                """, resume_id=resume_id, skill=skill)
    print("✅ Resumes pushed to Neo4j.")


# --- Function to Recommend Top Jobs for a Resume ---
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


if __name__ == "__main__":
    # 1. Push data from MongoDB to Neo4j
    push_jobs_to_neo4j()
    push_resumes_to_neo4j()

    # 2. Test recommendation (use a real resume _id from MongoDB)
    sample_resume_id = str(db[RESUMES_COLLECTION].find_one()["_id"])
    recs = recommend_jobs(sample_resume_id)
    print("\n🎯 Recommended Jobs:")
    print(json.dumps(recs, indent=4))
