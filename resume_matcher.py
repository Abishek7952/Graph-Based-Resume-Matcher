import os
import time
import requests # We will use this library for the upload
from affinda import AffindaAPI, TokenCredential
from affinda.models import Document

# 🔐 Your Affinda credentials
API_KEY = "aff_b0bf82b14e079c85b79f203e46859a084bd18459"
WORKSPACE_ID = "VRFFhNJa"

# 📄 Path to your resume file
PDF_FILE_PATH = "Abishek resume.pdf"

def parse_resume():
    """
    Uploads a resume to Affinda, waits for parsing, and prints the extracted data.
    """
    # We still use the client for getting the document later
    client = AffindaAPI(TokenCredential(API_KEY))

    if not os.path.exists(PDF_FILE_PATH):
        print(f"❌ Error: File not found at '{PDF_FILE_PATH}'")
        return

    # --- MANUAL UPLOAD BLOCK ---
    # We are replacing the broken client.create_document() with a direct API call.
    print("📤 Uploading resume...")
    try:
        # Prepare the request details
        url = "https://api.affinda.com/v3/documents"
        headers = {
            "Authorization": f"Bearer {API_KEY}"
        }
        data = {
            "workspace": WORKSPACE_ID
        }
        with open(PDF_FILE_PATH, "rb") as f:
            files = {
                "file": (os.path.basename(PDF_FILE_PATH), f, "application/pdf")
            }
            # Make the API call
            response = requests.post(url, headers=headers, data=data, files=files)
            # Raise an exception if the request failed
            response.raise_for_status() 
            
            # Get the document ID from the successful response
            response_json = response.json()
            document_id = response_json['meta']['identifier']

    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to upload document via requests: {e}")
        # Print the API's response if available, it often has useful info
        if e.response is not None:
            print(f"API Response: {e.response.text}")
        return
    except Exception as e:
        print(f"❌ An unexpected error occurred during upload: {e}")
        return
    # --- END OF MANUAL UPLOAD BLOCK ---


    if not document_id:
        raise RuntimeError("Failed to retrieve document ID after upload.")

    print(f"📄 Document uploaded successfully. ID: {document_id}")
    print("⏳ Waiting for parsing to complete...")

    while True:
        try:
            # Now we switch back to the Affinda client
            doc: Document = client.get_document(document_id)
            
            # Older SDKs use 'ready' and 'failed' boolean flags in the meta object
            if doc.meta.ready:
                print("✅ Parsing succeeded!\n")
                break
            elif doc.meta.failed:
                # The 'error' attribute itself often contains the message string
                error_detail = doc.meta.error or "Unknown reason"
                print(f"❌ Parsing failed. Reason: {error_detail}")
                return
            else:
                print("ℹ️  Document not ready, retrying...")

        except Exception as e:
            print(f"❌ An error occurred while checking status: {e}")
            return
            
        time.sleep(2)

    # The data object from an older SDK might not be mapped correctly,
    # so we treat it as a dictionary for safety.
    data = doc.data
    if not data:
        print("⚠️ No parsed data was returned.")
        return

    print("===== Parsed Resume Summary =====")
    
    name_obj = data.get('name', {}) or {}
    print(f"👤 Name: {name_obj.get('raw', 'N/A')}")
    
    emails = data.get('emails', []) or []
    print(f"✉️ Email: {', '.join(e.get('raw', '') for e in emails) if emails else 'N/A'}")

    phone_numbers = data.get('phoneNumbers', []) or []
    print(f"📞 Phone: {', '.join(p.get('raw', '') for p in phone_numbers) if phone_numbers else 'N/A'}")
    
    location = data.get('location', {}) or {}
    print(f"📍 Location: {location.get('raw', 'N/A')}")

    print("\n🛠 Skills:")
    skills = data.get('skills', []) or []
    if skills:
        for skill in skills:
            exp = f"({skill.get('experienceInMonths')} months)" if skill.get('experienceInMonths') else ""
            print(f" - {skill.get('name', 'N/A')} {exp}")
    else:
        print(" - Not specified")

    print("\n🎓 Education:")
    education_entries = data.get('education', []) or []
    if education_entries:
        for edu in education_entries:
            org = edu.get('organization', 'N/A')
            accreditation = edu.get('accreditation', {}) or {}
            degree = accreditation.get('education', 'N/A')
            dates = edu.get('dates', {}) or {}
            grad_date = dates.get('completionDate', 'N/A')
            print(f" - {degree} from {org} (Graduated: {grad_date})")
    else:
        print(" - Not specified")

    print("\n💼 Work Experience:")
    work_experience = data.get('workExperience', []) or []
    if work_experience:
        for exp in work_experience:
            dates = exp.get('dates', {}) or {}
            start_date = dates.get('startDate', '?')
            end_date = dates.get('endDate', 'Present')
            print(f" - {exp.get('jobTitle', 'N/A')} at {exp.get('organization', 'N/A')} ({start_date} ➝ {end_date})")
    else:
        print(" - Not specified")

    print("\n📋 Summary:")
    # Corrected line: Access the 'raw' attribute from the summary object
    summary_obj = data.get('summary', None)
    print(summary_obj.get('raw', 'N/A') if summary_obj else 'N/A')
    
    print("\n====================================")


if __name__ == "__main__":
    parse_resume()
