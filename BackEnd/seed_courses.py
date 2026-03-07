"""
seed_courses.py
───────────────
Run from the BackEnd directory:
    python seed_courses.py

Populates Firestore with 3 courses, each with 2 modules, each with 1 lesson,
using the schema:
  courses/{courseId}/modules/{moduleId}/lessons/{lessonId}
"""

import os, sys, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from firebase_admin import firestore

db = firestore.client()

COURSES = [
    {
        "id": "scratch-101",
        "data": {
            "title": "Creative Coding with Scratch",
            "description": "Build interactive stories, games, and animations using Scratch — the world's most popular kids' coding platform.",
            "ageGroup": "8–12",
            "difficulty": "beginner",
            "thumbnail": "https://c.animaapp.com/miv5b7ziJolmTE/img/rectangle.png",
            # Legacy fields kept so existing frontend helpers still work
            "name": "Creative Coding with Scratch",
            "details": "Build interactive stories, games, and animations using Scratch.",
            "category": "Coding",
            "price": "299",
            "currency": "Rs",
        },
        "modules": [
            {
                "id": "scratch-m1",
                "data": {"title": "Getting Started with Scratch", "order": 1},
                "lessons": [
                    {
                        "id": "scratch-m1-l1",
                        "data": {
                            "title": "What is Scratch?",
                            "content": "In this lesson you will log in to Scratch, explore the interface, and create your very first sprite.",
                            "duration": 15,
                            "order": 1,
                        },
                    }
                ],
            },
            {
                "id": "scratch-m2",
                "data": {"title": "Animations & Stories", "order": 2},
                "lessons": [
                    {
                        "id": "scratch-m2-l1",
                        "data": {
                            "title": "Making Your First Animation",
                            "content": "Drag-and-drop blocks to animate your sprite and tell a short story.",
                            "duration": 20,
                            "order": 1,
                        },
                    }
                ],
            },
        ],
    },
    {
        "id": "python-for-kids",
        "data": {
            "title": "Python for Young Makers",
            "description": "Learn real Python programming through fun projects: text games, artwork, and simple web pages.",
            "ageGroup": "11–15",
            "difficulty": "intermediate",
            "thumbnail": "https://c.animaapp.com/miujjzjc7Bh8SC/img/rectangle-5.png",
            "name": "Python for Young Makers",
            "details": "Learn real Python programming through fun projects.",
            "category": "Programming",
            "price": "399",
            "currency": "Rs",
        },
        "modules": [
            {
                "id": "python-m1",
                "data": {"title": "Hello, Python!", "order": 1},
                "lessons": [
                    {
                        "id": "python-m1-l1",
                        "data": {
                            "title": "Your First Python Program",
                            "content": "Install Python, open IDLE, and write a program that greets the world.",
                            "duration": 20,
                            "order": 1,
                        },
                    }
                ],
            },
            {
                "id": "python-m2",
                "data": {"title": "Variables & Logic", "order": 2},
                "lessons": [
                    {
                        "id": "python-m2-l1",
                        "data": {
                            "title": "Storing Data with Variables",
                            "content": "Learn what variables are and build a simple number-guessing game.",
                            "duration": 25,
                            "order": 1,
                        },
                    }
                ],
            },
        ],
    },
    {
        "id": "web-adventures",
        "data": {
            "title": "Web Adventures: HTML & CSS",
            "description": "Design and publish your own website from scratch using HTML and CSS — no experience required!",
            "ageGroup": "12–16",
            "difficulty": "beginner",
            "thumbnail": "https://c.animaapp.com/miv5b7ziJolmTE/img/rectangle-4.png",
            "name": "Web Adventures: HTML & CSS",
            "details": "Design and publish your own website using HTML and CSS.",
            "category": "Web Design",
            "price": "349",
            "currency": "Rs",
        },
        "modules": [
            {
                "id": "web-m1",
                "data": {"title": "Building Your First Webpage", "order": 1},
                "lessons": [
                    {
                        "id": "web-m1-l1",
                        "data": {
                            "title": "HTML Basics",
                            "content": "Learn the essential HTML tags and build a simple page about yourself.",
                            "duration": 18,
                            "order": 1,
                        },
                    }
                ],
            },
            {
                "id": "web-m2",
                "data": {"title": "Making it Beautiful with CSS", "order": 2},
                "lessons": [
                    {
                        "id": "web-m2-l1",
                        "data": {
                            "title": "Colors, Fonts & Layout",
                            "content": "Style your page with colors, Google Fonts, and a flex-based layout.",
                            "duration": 22,
                            "order": 1,
                        },
                    }
                ],
            },
        ],
    },
]


def seed():
    for course in COURSES:
        course_ref = db.collection("courses").document(course["id"])
        course_ref.set(course["data"])
        print(f"✅ Course: {course['id']}")

        for module in course["modules"]:
            mod_ref = course_ref.collection("modules").document(module["id"])
            mod_ref.set(module["data"])
            print(f"   📦 Module: {module['id']}")

            for lesson in module["lessons"]:
                les_ref = mod_ref.collection("lessons").document(lesson["id"])
                les_ref.set(lesson["data"])
                print(f"      📖 Lesson: {lesson['id']}")

    print("\n🎉 Seed complete — 3 courses written to Firestore.")


if __name__ == "__main__":
    seed()
