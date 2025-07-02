import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL;

export default function App() {
  const [servers, setServers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [searchQuery, setSearchQuery] = useState("");
  const [allTags, setAllTags] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [memberFilter, setMemberFilter] = useState("");
  const [filterType, setFilterType] = useState("more");





  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/servers`);
        const data = await res.json();

        const enriched = await Promise.all(
          data.map(async (server) => {
            if (server.name && server.member_count !== null) return server;

            try {
              const res = await fetch(
                `https://discord.com/api/invites/${server.invite_code}?with_counts=true`
              );
              if (!res.ok) throw new Error();
              const json = await res.json();
              const guild = json.guild || {};
              const profile = json.profile || {};
              const guild_id = guild.id;

              const buildImageUrl = (hash, id, type) => {
                if (!hash || !id) return null;
                const ext = hash.startsWith("a_") ? "gif" : "webp";
                if (type === "icon")
                  return `https://cdn.discordapp.com/icons/${id}/${hash}.${ext}`;
                if (type === "banner")
                  return `https://cdn.discordapp.com/banners/${id}/${hash}.${ext}?size=512`;
                return null;
              };

              return {
                ...server,
                name: guild.name || server.invite_code,
                description: guild.description,
                member_count: json.approximate_member_count,
                custom_tag: profile.tag,
                boost_tier: guild.premium_tier,
                icon_url: buildImageUrl(guild.icon, guild_id, "icon"),
                banner_url: buildImageUrl(guild.banner, guild_id, "banner"),
              };
            } catch {
              return server;
            }
          })
        );

        setServers(enriched);
        /*
        const allTags = Array.from(
          new Set(
            enriched.flatMap((s) =>
              s.tags?.split(",").map((t) => t.trim().toLowerCase()) || []
            )
          )
        );
        setAllTags(allTags);
        */
      } catch (err) {
        console.error("Failed to fetch servers:", err);
        }
      };
  
      fetchData();
    }, []);
  
  useEffect(() => {
    const allTagsList = servers.flatMap((s) =>
      (s.tags || "").split(",").map((t) => t.trim().toLowerCase())
    );
    const tagCount = {};
    allTagsList.forEach((tag) => {
      if (tag) tagCount[tag] = (tagCount[tag] || 0) + 1;
    });

    const sorted = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 10);

    setTopTags(sorted);
    setAllTags([...new Set(allTagsList)]);
  }, [servers]);


  useEffect(() => {
    const query = searchQuery.toLowerCase();

    if (query.includes("#")) {
      const tagChunks = query
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean);

      if (tagChunks.length > 0) {
        const matches = allTags
          .filter((tag) =>
            tagChunks.some((input) => tag.includes(input))
          )
          .slice(0, 10);

        setSuggestedTags(matches);
      } else {
        setSuggestedTags([]);
      }
    } else {
      setSuggestedTags([]);
    }
  }, [searchQuery, allTags]);

  const filteredServers = servers.filter((server) => {
    const query = searchQuery.toLowerCase();
    const tags = (server.tags || "").toLowerCase();
    const name = (server.name || "").toLowerCase();
    const desc = (server.description || "").toLowerCase();
    const count = server.member_count || 0;
    
    if (memberFilter) {
      const parsed = parseInt(memberFilter);
      if (filterType === "more" && count < parsed) return false;
      if (filterType === "less" && count > parsed) return false;
    }

    if (query.includes("#")) {
      const tagChunks = query
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean);

      return tagChunks.every((tag) =>
        tags.split(",").some((t) => t.trim().includes(tag))
      );
    }

    return (
      name.includes(query) ||
      desc.includes(query) ||
      tags.split(",").some((tag) => tag.trim().includes(query))
    );
  });

  return (
    <div className={`app-container ${menuOpen ? "menu-open" : ""} ${isMobile ? "mobile" : ""}`}>
      <div className="sidebar">
        <div className="search-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          🔍
        </div>
        {menuOpen && (
          <div className="top-search-panel">
            <h2>Search & Filters</h2>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div className="search-bar-wrapper">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search servers or #tags"
                  className="search-input"
                />
                                
                {searchQuery && (
                  <>
                    <div className="input-divider" />
                    <button
                      className="reset-button"
                      onClick={() => setSearchQuery("")}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>

            {suggestedTags.length > 0 && (
              <div className="autocomplete-suggestions">
                {suggestedTags.map((tag, index) => (
                  <div
                    key={index}
                    className="suggestion"
                    onClick={() => {
                      const parts = searchQuery.split(",");
                      parts[parts.length - 1] = ` #${tag}`;
                      const updated = parts.join(",").replace(/^,/, "").trim();
                      setSearchQuery(updated);
                    }}
                  >
                    #{tag}
                  </div>
                ))}
              </div>
            )}

            {topTags.length > 0 && (
              <div className="top-tags">
                <br></br>
                <p>Popular Tags:</p>
                <div className="tag-list">
                  {topTags.map((tag, index) => (
                    <span
                      key={index}
                      className="tag"
                      onClick={() => {
                        const current = searchQuery.trim();
                        const needsComma = current && !current.endsWith(",");
                        const prefix = needsComma ? `${current}, ` : current;
                        setSearchQuery(`${prefix}#${tag}`);
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="member-filter-panel">
              <p>Member Count:</p>
              <div className="member-filter-controls">
                <div className="member-input-wrapper">
                  <input
                    type="number"
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    placeholder="Filter by member count"
                    className="search-input"
                  />
                
                  {memberFilter && (
                    <>
                      <div className="input-divider" />
                      <button
                        className="reset-button"
                        onClick={() => setMemberFilter("")}
                        title="Clear member count filter"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
              <button
                className="toggle-filter"
                onClick={() =>
                  setFilterType((prev) => (prev === "more" ? "less" : "more"))
                }
              >
                {filterType === "more" ? "More than" : "Less than"}
              </button>
            </div>
          </div>
        )}
      </div>


      <div className="content">
        <div className="video-banner">
          <video autoPlay muted loop className="background-video">
            <source src="https://vrcidlinker.com/filesize.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="video-overlay">
            <h1 className="banner-text">Server Directory</h1>
          </div>
        </div>

        <div className="grid-container">
          {filteredServers.length === 0 ? (
            <p className="empty-message">No servers match your search.</p>
          ) : (
            filteredServers.map((server) => {
              const displayName = server.name || server.invite_code;
              const isInvalid = !server.name;
              const tagList = server.tags?.split(",").map((tag) => tag.trim()) || [];
              const primaryTags = tagList.slice(0, 2);
              const hiddenTags = tagList.slice(2);

              return (
                <div
                  key={server.id}
                  className="server-card"
                  style={{
                    backgroundImage: server.banner_url
                      ? `url(${server.banner_url})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="card-content">
                    {server.icon_url && (
                      <img
                        src={server.icon_url}
                        alt="icon"
                        className="server-icon large"
                      />
                    )}
                    <Link
                      to={`/invite/${server.invite_code}`}
                      className="server-name-link"
                      title={displayName}
                    >
                      <h2 className="server-name ellipsis">{displayName}</h2>
                    </Link>
                    {isInvalid && (
                      <span
                        className="invalid-warning"
                        title="This server is missing a Discord name."
                      >
                        ⚠
                      </span>
                    )}
                    {server.description && (
                      <div
                        className="server-description ellipsis"
                        data-full={server.description}
                        title={server.description}
                      >
                        {server.description}
                      </div>
                    )}
                    <div className="member-and-tags">
                      {server.member_count != null && (
                        <div className="member-count">
                          {server.member_count.toLocaleString()} members
                        </div>
                      )}
                      <div className="tag-container">
                        {primaryTags.map((tag, index) => (
                          <span key={index} className="tag">
                            {tag}
                          </span>
                        ))}
                        {hiddenTags.length > 0 && (
                          <span className="tag more-tag" title={hiddenTags.join(", ")}>
                            +{hiddenTags.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
