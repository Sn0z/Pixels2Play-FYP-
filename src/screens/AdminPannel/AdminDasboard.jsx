import React, { useState, useEffect } from "react";
import { db } from "../../FireBase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

export default function AdminPanel() {
  const [page, setPage] = useState("dashboard");
  const [courses, setCourses] = useState([]);
  const [editId, setEditId] = useState(null);

  const [course, setCourse] = useState({
    name: "",
    duration: "",
    details: "",
    price: "",
    category: "",
    ageRange: "",
    thumbnail: "",
  });

  const loadCourses = async () => {
    const snap = await getDocs(collection(db, "courses"));
    setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleInput = (e) =>
    setCourse({ ...course, [e.target.name]: e.target.value });

  const saveCourse = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "courses"), course);
    alert("Course Added");
    setPage("courses");
    loadCourses();
  };

  const deleteCourse = async (id) => {
    await deleteDoc(doc(db, "courses", id));
    loadCourses();
  };

  const loadSingleCourse = async (id) => {
    const snap = await getDoc(doc(db, "courses", id));
    setCourse(snap.data());
    setEditId(id);
    setPage("edit");
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "courses", editId), course);
    alert("Course Updated");
    setPage("courses");
    loadCourses();
  };

  return (
    <div>
      {/* DASHBOARD */}
      {page === "dashboard" && (
        <div>
          <h1>Admin Dashboard</h1>
          <button onClick={() => setPage("courses")}>Manage Courses</button>
          <button onClick={() => setPage("add")}>Add Course</button>
        </div>
      )}

      {/* COURSE LIST */}
      {page === "courses" && (
        <div>
          <h2>All Courses</h2>
          <button onClick={() => setPage("dashboard")}>Back</button>
          <button onClick={() => setPage("add")}>Add Course</button>

          <ul>
            {courses.map((c) => (
              <li key={c.id}>
                <b>{c.name}</b> - {c.price} USD  
                <button onClick={() => loadSingleCourse(c.id)}>Edit</button>
                <button onClick={() => deleteCourse(c.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ADD COURSE */}
      {page === "add" && (
        <div>
          <h2>Add Course</h2>
          <button onClick={() => setPage("dashboard")}>Back</button>

          <form onSubmit={saveCourse}>
            <p>Course Name:</p>
            <input name="name" onChange={handleInput} />

            <p>Duration:</p>
            <input name="duration" onChange={handleInput} />

            <p>Details:</p>
            <textarea name="details" onChange={handleInput} />

            <p>Price:</p>
            <input name="price" onChange={handleInput} />

            <p>Category:</p>
            <input name="category" onChange={handleInput} />

            <p>Age Range:</p>
            <input name="ageRange" onChange={handleInput} />

            <p>Thumbnail URL:</p>
            <input name="thumbnail" onChange={handleInput} />

            <br /><br />
            <button>Add Course</button>
          </form>
        </div>
      )}

      {/* EDIT COURSE */}
      {page === "edit" && (
        <div>
          <h2>Edit Course</h2>
          <button onClick={() => setPage("courses")}>Back</button>

          <form onSubmit={saveEdit}>
            <p>Course Name:</p>
            <input
              name="name"
              value={course.name}
              onChange={handleInput}
            />

            <p>Duration:</p>
            <input
              name="duration"
              value={course.duration}
              onChange={handleInput}
            />

            <p>Details:</p>
            <textarea
              name="details"
              value={course.details}
              onChange={handleInput}
            />

            <p>Price:</p>
            <input
              name="price"
              value={course.price}
              onChange={handleInput}
            />

            <p>Category:</p>
            <input
              name="category"
              value={course.category}
              onChange={handleInput}
            />

            <p>Age Range:</p>
            <input
              name="ageRange"
              value={course.ageRange}
              onChange={handleInput}
            />

            <p>Thumbnail URL:</p>
            <input
              name="thumbnail"
              value={course.thumbnail}
              onChange={handleInput}
            />

            <br /><br />
            <button>Save Changes</button>
          </form>
        </div>
      )}
    </div>
  );
}
