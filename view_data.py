# Import the specific viewing functions from your database module
from Database_Storing import view_all_resumes, view_all_job_descriptions
import time

def main_menu():
    """
    Displays a menu for the user to choose which data to view
    and calls the appropriate function.
    """
    while True:
        print("\n" + "="*30)
        print("      DATABASE VIEW MENU")
        print("="*30)
        print("  1. View All Candidate Resumes")
        print("  2. View All Job Descriptions")
        print("  3. Exit")
        print("-"*30)

        choice = input("Enter your choice (1, 2, or 3): ")

        if choice == '1':
            print("\nFetching candidate resumes...")
            time.sleep(1) # A small delay for better user experience
            view_all_resumes()
            input("\nPress Enter to return to the menu...")
        elif choice == '2':
            print("\nFetching job descriptions...")
            time.sleep(1) # A small delay
            view_all_job_descriptions()
            input("\nPress Enter to return to the menu...")
        elif choice == '3':
            print("Exiting program. Goodbye! ")
            break
        else:
            print("\n Invalid choice! Please enter 1, 2, or 3.")
            time.sleep(2) # A small delay to allow user to read the message

if __name__ == "__main__":
    main_menu()