import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./screens/Home";
import Login from "./screens/Login/Login";
import SignUp from "./screens/SignUp/SignUp";
import Setup1 from "./screens/ChildAccountSetup/ChildAccountSetup1";
import Setup2 from "./screens/ChildAccountSetup/ChildAccountSetup2";
// import Setup3 from "./screens/ChildAccountSetup/ChildAccountSetup3";
import { AuthProvider } from "./contexts/authContext";


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/setup1" element={<Setup1 />} />
          <Route path="/setup2" element={<Setup2 />} />
          {/* <Route path="/setup3" element={<Setup3 />} /> */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
