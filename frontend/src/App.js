import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

export default function App() {
  return (
    <div className="landing-wrapper">
      <video autoPlay muted loop playsinline className="background-video">
        <source src="./filesize.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="overlay" />

      <div className="landing-content">
        <h1 className="landing-title">Welcome to<br></br>VRC Linked</h1>
        <p className="landing-description">
          18+ Verified Discord servers using VRChat ID Linker.
        </p>

        <div className="landing-buttons">
          <Link to="/servers" className="button primary">
            Browse Servers →
          </Link>
          <a
            href="https://vrcidlinker.com/vrl/"
            className="button secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            VRC ID Linker →
          </a>
        </div>
      </div>
    </div>
  );
}
