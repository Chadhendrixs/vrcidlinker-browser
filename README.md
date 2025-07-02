# VRCIDLinker Server Browser

This repository contains the source code for the **VRCIDLinker Server Browser**, a web-based interface that will display Discord servers using the VRCIDLinker bot. It allows users to explore participating communities, view server stats, and access public invite links.

This project is being published for **transparency only**. It is not open source and not intended for reuse or redistribution.

## Purpose

The Server Browser is designed to complement the VRCIDLinker bot by:

- Displaying a public-facing list of servers that have enabled discovery
- Allowing users to search by tags and metadata
- Linking directly to invite pages and server details
- Helping verified users find relevant communities

## License and Usage

There is **no license** on this repository. This code is not free to reuse, modify, or redistribute. All rights are reserved by the author.

The project is made public for transparency only.

## Contact

For questions or information about the VRCIDLinker project or the server browser, contact the repository owner via [Discord](https://discord.gg/BH2QA8Jezs).

---

## Repository Structure

This project is divided into two main parts:

### `frontend/` – Server Browser Interface (React)

Implements the browser-based user interface.

- `public/` – Static files (favicon, manifest, logos)
- `src/` – Main React application
  - `App.js` – Root component
  - `index.js` – Entry point
  - `pages/InviteDetail.js` – Invite detail route
  - `App.css`, `index.css`, etc. – Styling
  - `reportWebVitals.js`, `setupTests.js` – React test/bootstrap files
- `package.json` – Dependency and script definitions

### `backend/` – Server-Side API (Python / FastAPI)

Provides data to the frontend and performs background operations.

- `main.py` – FastAPI entry point
- `models.py` – Pydantic models for API data
- `database.py` – Database connection and queries
- `tasks.py` – Background refresh tasks or scheduled jobs
- `requirements.txt` – Python dependency list
