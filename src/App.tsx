import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Monitor from "@/pages/Monitor";
import Dispatch from "@/pages/Dispatch";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/monitor" element={<Monitor />} />
        <Route path="/dispatch" element={<Dispatch />} />
      </Routes>
    </Router>
  );
}
