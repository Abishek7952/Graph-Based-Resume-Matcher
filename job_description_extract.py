import pandas as pd
from sentence_transformers import SentenceTransformer, util
import torch
import re

def load_skills(file_path):
    df = pd.read_csv(file_path)
    if 'Skill' not in df.columns:
        raise ValueError("CSV must contain a 'Skill' column")
    skills = df['Skill'].dropna().astype(str).tolist()
    return skills


def clean_skill(skill):
    """Remove numbers and brackets, e.g., 'Data Science (740)' → 'Data Science'"""
    return re.sub(r'\s*\(.*?\)', '', skill).strip().lower()

def match_skills(job_desc, skills, model, top_k=10):
    jd_embedding = model.encode(job_desc, convert_to_tensor=True)
    skill_embeddings = model.encode(skills, convert_to_tensor=True)

    if skill_embeddings.shape[0] == 0:
        raise ValueError("No skill embeddings found. Check if skills list is empty.")

    cosine_scores = util.cos_sim(jd_embedding, skill_embeddings)[0]

    # Map to hold best score per cleaned skill
    best_skills = {}

    for i, score in enumerate(cosine_scores):
        raw_skill = skills[i]
        base_skill = clean_skill(raw_skill)
        score_value = score.item()

        if base_skill not in best_skills or score_value > best_skills[base_skill][1]:
            best_skills[base_skill] = (raw_skill, score_value)

    # Sort and print top K
    sorted_skills = sorted(best_skills.values(), key=lambda x: x[1], reverse=True)[:top_k]

    print("\n🔍 Top distinct matching skills:")
    for skill, score in sorted_skills:
        print(f" {skill} (score: {score:.4f})")


def main():
    job_desc = input("Enter job description:\n> ").strip()
    print(" Loading model...")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

    print(" Encoding job description...")
    skills = load_skills("skills.csv")
    print(f" Loaded {len(skills)} skills.")

    match_skills(job_desc, skills, model)

if __name__ == "__main__":
    main()
