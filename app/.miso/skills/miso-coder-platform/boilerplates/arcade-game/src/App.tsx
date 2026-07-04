import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./styles/theme.css";
import "./styles/globals.css";

import LandingPage from "./pages/LandingPage";
import SnakePage from "./games/snake/SnakePage";
import TetrisPage from "./games/tetris/TetrisPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/games/tetris" element={<TetrisPage />} />
        <Route path="/games/snake" element={<SnakePage />} />
      </Routes>
    </BrowserRouter>
  );
}
