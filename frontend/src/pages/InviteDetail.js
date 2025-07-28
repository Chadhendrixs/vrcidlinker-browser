import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./css/InviteDetail.module.css";
import ColorThief from "colorthief";
import { useRef } from "react";
import Footer from '../Footer';

const API_URL = process.env.REACT_APP_API_URL;

export default function InviteDetail() {
  const { code } = useParams();
  const [server, setServer] = useState(null);
  const isMobile = window.innerWidth <= 768;
  const bannerImgRef = useRef(null);
  const iconRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  function hashStringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = (hash >> 0) & 0xff;
    const g = (hash >> 8) & 0xff;
    const b = (hash >> 16) & 0xff;
    return `rgb(${r}, ${g}, ${b})`;
  }

  function applyBannerGradient(element, color1, color2) {
    element.style.backgroundImage = `linear-gradient(135deg, ${color1}, ${color2})`;
    element.style.backgroundSize = "cover";
    element.style.backgroundRepeat = "no-repeat";
    element.style.backgroundPosition = "center";
    element.style.borderRadius = "80px";
    element.style.transform = "translate(3%, 6%)";
    element.style.boxShadow = "0 0 40px 10px rgba(0, 0, 0, 0.5)";
  }

  useEffect(() => {
    const fetchServer = async () => {
      try {
        const res = await fetch(`${API_URL}/invite/${code}`);
        if (!res.ok) throw new Error("Failed to fetch server");

        const data = await res.json();

        // Ensure compatibility with your frontend props
        const serverData = {
          name: data.name || code,
          description: data.description || "",
          memberCount: data.member_count || 0,
          customTag: data.custom_tag || null,
          crossverify: data.crossverify || false,
          boostTier: data.boost_tier || 0,
          iconURL: data.icon_url || null,
          bannerURL: data.banner_url || null,
          tags: (data.custom_tags || []).join(", "), // or however your frontend expects
          invite_url: `https://discord.gg/${code}`,
        };

        setServer(serverData);
      } catch (err) {
        console.error("Error fetching invite:", err);
      }
    };

    fetchServer();
  }, [code]);

  useEffect(() => {
    if (!server) return;

    const bannerImg = bannerImgRef.current;
    const wrapper = bannerImg.closest(`.${styles.bannerWrapper}`);

    if (!wrapper) return;

    // If we have a banner image, try to use it with ColorThief
    if (server.bannerURL) {
      bannerImg.crossOrigin = "anonymous";
      bannerImg.onload = () => {
        try {
          const colorThief = new ColorThief();
          const dominant = colorThief.getColor(bannerImg);
          bannerImg.style.boxShadow = `0 0 60px 20px rgba(${dominant[0]}, ${dominant[1]}, ${dominant[2]}, 0.5)`;
        } catch {
          // fallback if ColorThief fails
          bannerImg.style.boxShadow = "none";
        }
      };
      return;
    }

    // No banner? Remove the <img>
    bannerImg.style.display = "none";

    // If icon exists, use it to extract a gradient
    if (server.iconURL) {
      const iconImg = new Image();
      iconImg.crossOrigin = "anonymous";
      iconImg.src = server.iconURL;

      iconImg.onload = () => {
        try {
          const colorThief = new ColorThief();
          const palette = colorThief.getPalette(iconImg, 2);
          const c1 = `rgb(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]})`;
          const c2 = `rgb(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]})`;
          applyBannerGradient(wrapper, c1, c2);
        } catch {
          // fallback to name-based color
          const base = hashStringToColor(server.name);
          applyBannerGradient(wrapper, base, "#000");
        }
      };
    } else {
      // No icon either? Use name as fallback
      const base = hashStringToColor(server.name);
      applyBannerGradient(wrapper, base, "#000");
      iconRef.current.style.backgroundColor = base;
      iconRef.current.style.objectFit = "contain";
      iconRef.current.style.padding = "12px";
    }
  }, [server]);

  if (!server) return <div>Loading...</div>;

  return (
    <div className={`${styles.inviteContainer} ${isMobile ? styles.mobile : ""}`}>
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4469288001060919"
     crossorigin="anonymous"></script>
      {/* --- TOP HEADER --- */}
      <header className={styles.mainHeader}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <a style={{ textDecoration: "none" }} href="../servers"><img src="../favicon.ico" alt="Logo" className={styles.logoImage} /></a>
            <a style={{ textDecoration: "none" }} className={styles.logoTitle} href="../servers">VRC LINKED</a>
          </div>
        </div>
      </header>

      {/* --- SERVER CARD --- */}
      <div className={styles.card}>
        <div className={styles.bannerWrapper}>
          <img
            ref={bannerImgRef}
            src={server.bannerURL}
            className={styles.banner}
            alt="Server Banner"
          />
          <img ref={iconRef} src={server.iconURL || "../disc.png"} className={styles.serverIcon} alt="Server Icon" />
        </div>

        <div className={styles.cardContent}>
          <div className={styles.cardGrid}>
            <div className={styles.leftColumn}>
              <div className={styles.header}>
                <h1 className={styles.serverName}><i>{server.name}</i></h1>
                <div className={styles.infoRow}>
                  <span className={styles.memberCount}>
                    • {server.memberCount?.toLocaleString() ?? "?"} Members
                  </span>
                  {server.crossverify && (
                    <span className={styles.splitBadge}>
                      <span className={styles.left}>⇄</span>
                      <span className={styles.right}>🗸</span>
                    </span>
                  )}
                  {server.customTag && (
                    <span className={styles.splitBadge}>
                      <span className={styles.left}>Tag:</span>
                      <span className={styles.right}>{server.customTag}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.descriptionSection}>
                <h2 className={styles.aboutTitle}>ABOUT</h2>
                <p className={styles.description}>{server.description}</p>
              </div>
            </div>

            <div className={styles.rightColumn}>
              <div className={styles.buttonsWrapper}>
                <a href={server.invite_url} className={styles.joinBtn}>Join Server</a>
                <button onClick={handleShare} className={styles.shareBtn}>
                  Share Server
                </button>
                {copied && <span className={styles.copiedPopup}>Copied to clipboard!</span>}
              </div>

              {server.tags?.length > 0 && (
                <div className={styles.tagSection}>
                  <h3>Tags</h3>
                  <div className={styles.tagList}>
                    {server.tags.split(",").map((tag, idx) => (
                      <span key={idx} className={styles.tag}>{tag.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
