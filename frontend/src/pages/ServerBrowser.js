import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import "./ServerBrowser.css";
import TooltipPortal from "../TooltipPortal";

const API_URL = process.env.REACT_APP_API_URL;

export default function ServerBrowser() {
  const [servers, setServers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [searchQuery, setSearchQuery] = useState("");
  const [allTags, setAllTags] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [memberFilter, setMemberFilter] = useState("");
  const [filterType, setFilterType] = useState("more");
  const [customTagOnly, setCustomTagOnly] = useState(false);
  const [crossVerifyOnly, setCrossVerifyOnly] = useState(false);
  const [serverCount, setServerCount] = useState(0);
  const [verifiedUserCount, setVerifiedUserCount] = useState(0);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [selectedPromotedServers, setSelectedPromotedServers] = useState([]);




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
                crossverify: profile.crossverify || false,
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

  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then(res => res.json())
      .then(data => {
        setServerCount(data.server_count);
        setVerifiedUserCount(data.verified_users);
      });
  }, []);


  const _filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return servers.filter((server) => {
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

      if (customTagOnly && !server.custom_tag) return false;
      if (crossVerifyOnly && !server.crossverify) return false;

      return (
        name.includes(query) ||
        desc.includes(query) ||
        tags.split(",").some((tag) => tag.trim().includes(query))
      );
    });
  }, [
    servers,
    searchQuery,
    memberFilter,
    filterType,
    customTagOnly,
    crossVerifyOnly,
  ]);

  useEffect(() => {
    const promos = _filtered.filter(s => s.promoted);
    const selected = [...promos].sort(() => 0.5 - Math.random()).slice(0, 3);
    setSelectedPromotedServers(selected);
  }, [_filtered]);


  const filteredServers = _filtered.filter(s => !selectedPromotedServers.includes(s));
  
  useEffect(() => {
    if (!hoveredTooltip) return;

    const handleScroll = () => setHoveredTooltip(null);

    const handleClickOutside = (e) => {
      const tooltip = document.querySelector(".server-description-tooltip");
      const wrappers = document.querySelectorAll(".server-description-wrapper");

      const clickedInsideWrapper = Array.from(wrappers).some(wrapper =>
        wrapper.contains(e.target)
      );

      const clickedInsideTooltip = tooltip && tooltip.contains(e.target);

      if (!clickedInsideWrapper && !clickedInsideTooltip) {
        setHoveredTooltip(null);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [hoveredTooltip]);

  return (
    <div className={`app-container ${menuOpen ? "menu-open" : ""} ${isMobile ? "mobile" : ""}`}>
      {/* --- TOP HEADER --- */}
      {!isMobile && (
        <header className="main-header">
          <div className="header-content">
            <div className="logo">
              <button
                className="search-icon-btn header-search-btn"
                onClick={() => setMenuOpen(true)}
                aria-label="Open search"
              >
                🔍
              </button>
              <span className="logo-title">VRC LINKED</span>
            </div>
          </div>
        </header>
      )}

      {/* --- SEARCH SIDE PANEL (desktop only) --- */}
      {!isMobile && menuOpen && (
        <>
          <div
            className="search-overlay-bg"
            onClick={() => setMenuOpen(false)}
          />
          <div className="search-side-panel">
            <div className="search-panel-header">
              <span style={{ fontWeight: 600, fontSize: "1.2rem" }}>Search & Filters</span>
              <button
                className="close-overlay-btn"
                onClick={() => setMenuOpen(false)}
                title="Close"
              >
                ✖
              </button>
            </div>
              <div className="search-panel-content">
                <div className="search-bar-wrapper">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search servers or #tags"
                    className="desktop-search-input"
                    autoFocus
                  />
                  {searchQuery && (
                    <>
                    <div className="input-divider" />
                    <button
                      className="reset-button"
                      onClick={() => setSearchQuery("")}
                      title="Clear search"
                      style={{ marginLeft: 8 }}
                    >
                      ✕
                    </button>
                    </>
                  )}
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
              <div className="member-filter-panel" style={{ marginTop: 16 }}>
                <p>Member Count:</p>
                <div className="member-filter-controls">
                  <div className="member-input-wrapper">
                    <div className="input-group member-filter-input-group">
                      <input
                        type="number"
                        value={memberFilter}
                        onChange={(e) => setMemberFilter(e.target.value)}
                        placeholder="e.g. 100"
                        className="search-input"
                      />
                      {memberFilter && (
                        <>
                          <div className="input-divider" />
                          <button
                            className="reset-button"
                            onClick={() => setMemberFilter("")}
                            title="Clear member count"
                          >
                            ✕
                          </button>
                        </>
                      )}
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
                </div>
                <div className="custom-tag-filter" style={{ marginTop: 40 }}>
                  <span className="switch-label">Cross verify enabled:</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={crossVerifyOnly}
                      onChange={(e) => setCrossVerifyOnly(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="custom-tag-filter" style={{ marginTop: 8 }}>
                  <span className="switch-label">Has a custom tag:</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={customTagOnly}
                      onChange={(e) => setCustomTagOnly(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- SIDEBAR (mobile only) --- */}
      {isMobile && (
        <>
          {/* HEADER BAR */}
          <div className="sidebar">
            <div className="mobile-header-content">
              <div
                className="search-toggle"
                onClick={() => setMenuOpen(!menuOpen)}
                title="Open search"
              >
                🔍
              </div>
              <div className="mobile-header-title">VRC LINKED</div>
            </div>
          </div>

          {/* OVERLAY BACKDROP */}
          {menuOpen && (
            <div className="overlay-bg" onClick={() => setMenuOpen(false)} />
          )}

          {/* SEARCH PANEL */}
          <div className={`top-search-panel ${menuOpen ? "open" : ""}`}>
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
                <br></br>
                <p>Member Count:</p>
                <div className="member-filter-controls">
                  <div className="member-input-wrapper">
                    <input
                      type="number"
                      value={memberFilter}
                      onChange={(e) => setMemberFilter(e.target.value)}
                      placeholder="e.g. 100"
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
                    <button
                      className="toggle-filter"
                      onClick={() =>
                        setFilterType((prev) => (prev === "more" ? "less" : "more"))
                      }>
                      {filterType === "more" ? "More than" : "Less than"}
                    </button>
                  </div>
                </div>
                <div className="custom-tag-filter">
                  <span className="switch-label">Has a custom tag:</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={customTagOnly}
                      onChange={(e) => setCustomTagOnly(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="custom-tag-filter">
                  <span className="switch-label">Cross verify enabled:</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={crossVerifyOnly}
                      onChange={(e) => setCrossVerifyOnly(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
        </>
      )}


      {/* --- MAIN CONTENT --- */}
      <div className="content">
        <div className="video-banner">
          <video autoPlay muted loop className="background-video">
            <source src="./filesize.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="video-overlay">
            <h1 className="banner-title">VRC LINKED</h1>
            <h4 className="banner-subtitle">
              Servers protected and ID verified by{" "}
              <a href="https://vrcidlinker.com/vrl/" target="_blank" rel="noopener noreferrer">
                VRC ID Linker
              </a>
            </h4>
            <h4 className="banner-subtitle">
              {serverCount.toLocaleString()} servers protected, {verifiedUserCount.toLocaleString()} users verified.
            </h4>
          </div>
        </div>

        {selectedPromotedServers.length > 0 && (
          <div className="promoted-section">
            <div className="promoted-block">
              <div className="promoted-container">
                <h2 className="promoted-title">⭐ Promoted Servers</h2>
                <div className="grid-container promoted-grid">
                  {selectedPromotedServers.map((server) => {
                    const displayName = server.name || server.invite_code;
                    const isInvalid = !server.name;
                    const tagList = server.tags?.split(",").map((tag) => tag.trim()) || [];
                    const primaryTags = tagList.slice(0, 2);
                    const hiddenTags = tagList.slice(2);

                    return (
                      <div
                        key={`promoted-${server.id}`}
                        className="server-card promoted-card"
                        style={{
                          backgroundImage: server.banner_url
                            ? `url(${server.banner_url})`
                            : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        {server.custom_tag && (
                          <div className={`custom-tag-wrapper ${server.crossverify ? "shift-left" : ""}`}>
                            <span className="custom-tag-label">
                              {server.custom_tag.toUpperCase()}
                            </span>
                            <span className="custom-tag-tooltip">
                              This server has a custom tag! This can be displayed on your discord profile if you wish.
                            </span>
                          </div>
                        )}
                        {server.crossverify && (
                          <div className="cross-verify-wrapper">
                            <span className="cross-verify-label">⇄</span>
                            <span className="cross-verify-tooltip">
                              This server has cross verification enabled! If you're already verified with the bot, you will be automatically verified here.
                            </span>
                          </div>
                        )}
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
                              className="server-description-wrapper"
                              onClick={(e) => {
                                const alreadyOpen = hoveredTooltip === server.id;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const centerX = rect.left + rect.width / 2;
                                const centerY = rect.top + rect.height / 2;

                                if (alreadyOpen) {
                                  setHoveredTooltip(null);
                                } else {
                                  setHoveredTooltip(server.id);
                                  setMouseX(centerX);
                                  setMouseY(centerY);
                                }
                              }}
                            >
                              <div className="server-description ellipsis">
                                {server.description}
                              </div>
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
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

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
                  {server.custom_tag && (
                    <>
                    <div className={`custom-tag-wrapper ${server.crossverify ? "shift-left" : ""}`}>
                      <span className="custom-tag-label">
                        {server.custom_tag.toUpperCase()}
                      </span>
                      <span className="custom-tag-tooltip">
                        This server has a custom tag! This can be displayed on your discord profile if you wish.
                      </span>
                    </div>
                    </>
                  )}
                  {server.crossverify && (
                    <>
                    <div className="cross-verify-wrapper">
                      <span className="cross-verify-label">
                        ⇄
                      </span>
                      <span className="cross-verify-tooltip">
                        This server has cross verification enabled! If you're already verified with the bot, you will be automatically verified here.
                      </span>
                    </div>
                    </>
                  )}
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
                        className="server-description-wrapper"
                        onClick={(e) => {
                          const alreadyOpen = hoveredTooltip === server.id;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const centerX = rect.left + rect.width / 2;
                          const centerY = rect.top + rect.height / 2;

                          if (alreadyOpen) {
                            setHoveredTooltip(null);
                          } else {
                            setHoveredTooltip(server.id);
                            setMouseX(centerX);
                            setMouseY(centerY);
                          }
                        }}
                      >
                        <div className="server-description ellipsis">
                          {server.description}
                        </div>
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
        {hoveredTooltip && (
          <TooltipPortal>
            <div
              className="server-description-tooltip"
              style={{
                position: "fixed",
                top: `${mouseY}px`,
                left: `${mouseX}px`,
                zIndex: 9999,
                display: "block",
              }}
            >
              {
                [...selectedPromotedServers, ...filteredServers].find(
                  (s) => s.id === hoveredTooltip
                )?.description
              }
            </div>
          </TooltipPortal>
        )}
      </div>
    </div>
  );
}
