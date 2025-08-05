import pprint
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# --- CONFIGURATION ---
MONGO_CONNECTION_STRING = "mongodb://localhost:27017/"
DB_NAME = "resume_data"
COLLECTION_NAME = "resumes"

def get_mongo_client():
    """Establishes connection to MongoDB and returns the client."""
    try:
        client = MongoClient(MONGO_CONNECTION_STRING)
        client.admin.command('ismaster')
        return client
    except ConnectionFailure as e:
        print(f"❌ MongoDB connection failed: {e}")
        return None

def store_resume_data(data):
    """Stores a dictionary of parsed resume data in MongoDB."""
    if MONGO_CONNECTION_STRING == "YOUR_MONGO_CONNECTION_STRING":
        print("❌ Error: Please add your MongoDB Connection String to database.py")
        return

    client = get_mongo_client()
    if client:
        try:
            db = client[DB_NAME]
            collection = db[COLLECTION_NAME]
            insert_result = collection.insert_one(data)
            print(f"✅ Data successfully stored in MongoDB with ID: {insert_result.inserted_id}")
        except Exception as e:
            print(f"❌ Failed to insert data into MongoDB: {e}")
        finally:
            client.close()
            print("🔌 MongoDB connection closed.")

def view_all_resumes():
    """Retrieves and prints all resume documents from MongoDB."""
    print("📄 Connecting to MongoDB to view data...")
    client = get_mongo_client()
    if client:
        try:
            db = client[DB_NAME]
            collection = db[COLLECTION_NAME]

            print(f"\n--- Viewing all documents in '{COLLECTION_NAME}' collection ---")
            resumes = list(collection.find())

            if not resumes:
                print("No resumes found in the database.")
            else:
                for resume in resumes:
                    # Use pprint for nicely formatted output
                    pprint.pprint(resume)
                    print("-" * 20) # Separator for each resume
                print(f"\nFound {len(resumes)} document(s).")

        except Exception as e:
            print(f"❌ Failed to retrieve data from MongoDB: {e}")
        finally:
            client.close()
            print("🔌 MongoDB connection closed.")

