import pprint
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# --- CONFIGURATION ---
MONGO_CONNECTION_STRING = "mongodb://localhost:27017/"

# --- Database and Collection names for RESUMES ---
RESUME_DB_NAME = "resume_data"
RESUME_COLLECTION_NAME = "resumes"

# --- Database and Collection names for JOB DESCRIPTIONS ---
JOB_DB_NAME = "job_postings"
JOB_COLLECTION_NAME = "descriptions"

def get_mongo_client():
    """Establishes connection to MongoDB and returns the client."""
    try:
        client = MongoClient(MONGO_CONNECTION_STRING)
        # The ismaster command is cheap and does not require auth.
        client.admin.command('ismaster')
        return client
    except ConnectionFailure as e:
        print(f" MongoDB connection failed: {e}")
        return None

# --- RESUME-SPECIFIC FUNCTIONS ---

def store_resume_data(data):
    """Stores a dictionary of parsed resume data in MongoDB."""
    if MONGO_CONNECTION_STRING == "YOUR_MONGO_CONNECTION_STRING":
        print(" Error: Please update your MongoDB Connection String in Database_Storing.py")
        return

    client = get_mongo_client()
    if client:
        try:
            db = client[RESUME_DB_NAME]
            collection = db[RESUME_COLLECTION_NAME]
            insert_result = collection.insert_one(data)
            print(f" Resume data successfully stored in MongoDB ('{RESUME_DB_NAME}') with ID: {insert_result.inserted_id}")
        except Exception as e:
            print(f" Failed to insert resume data into MongoDB: {e}")
        finally:
            client.close()
            print(" MongoDB connection closed.")

def view_all_resumes():
    """Retrieves and prints all resume documents from MongoDB."""
    print(f" Connecting to MongoDB to view resumes from '{RESUME_DB_NAME}'...")
    client = get_mongo_client()
    if client:
        try:
            db = client[RESUME_DB_NAME]
            collection = db[RESUME_COLLECTION_NAME]

            print(f"\n--- Viewing all documents in '{RESUME_COLLECTION_NAME}' collection ---")
            documents = list(collection.find())

            if not documents:
                print("No resumes found in the database.")
            else:
                for doc in documents:
                    pprint.pprint(doc)
                    print("-" * 20)
                print(f"\nFound {len(documents)} resume document(s).")

        except Exception as e:
            print(f" Failed to retrieve resume data from MongoDB: {e}")
        finally:
            client.close()
            print(" MongoDB connection closed.")

# --- JOB DESCRIPTION-SPECIFIC FUNCTIONS ---

def store_job_description_data(data):
    """Stores a dictionary of parsed job description data in MongoDB."""
    if MONGO_CONNECTION_STRING == "YOUR_MONGO_CONNECTION_STRING":
        print(" Error: Please update your MongoDB Connection String in Database_Storing.py")
        return

    client = get_mongo_client()
    if client:
        try:
            db = client[JOB_DB_NAME]
            collection = db[JOB_COLLECTION_NAME]
            insert_result = collection.insert_one(data)
            print(f" Job data successfully stored in MongoDB ('{JOB_DB_NAME}') with ID: {insert_result.inserted_id}")
        except Exception as e:
            print(f" Failed to insert job data into MongoDB: {e}")
        finally:
            client.close()
            print(" MongoDB connection closed.")

def view_all_job_descriptions():
    """Retrieves and prints all job description documents from MongoDB."""
    print(f" Connecting to MongoDB to view jobs from '{JOB_DB_NAME}'...")
    client = get_mongo_client()
    if client:
        try:
            db = client[JOB_DB_NAME]
            collection = db[JOB_COLLECTION_NAME]

            print(f"\n--- Viewing all documents in '{JOB_COLLECTION_NAME}' collection ---")
            documents = list(collection.find())

            if not documents:
                print("No job descriptions found in the database.")
            else:
                for doc in documents:
                    pprint.pprint(doc)
                    print("-" * 20)
                print(f"\nFound {len(documents)} job document(s).")

        except Exception as e:
            print(f" Failed to retrieve job data from MongoDB: {e}")
        finally:
            client.close()
            print(" MongoDB connection closed.")