import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={styles.footer}>
      <div style={styles.content}>
        <p style={styles.text}>
          &copy; {currentYear} CHCreations ·{' '}
          <a href="https://vrcidlinker.com/terms.html" style={styles.link}>Terms of Service</a> ·{' '}
          <a href="https://vrcidlinker.com/vrl/" target="_blank" style={styles.link}>vrcidlinker.com</a> ·{' '}
          <a href="https://discord.gg/BH2QA8Jezs" target="_blank" rel="noopener noreferrer" style={styles.link}>
            Support Discord
          </a>
        </p>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    background: '#192744ff',
    color: '#ccc',
    padding: '20px',
    textAlign: 'center',
    fontSize: '14px',
    borderTop: '1px solid #333',
    marginTop: '40px',
    width: '100%',
    boxSizing: 'border-box', // Prevents padding from causing overflow
    overflowX: 'hidden',
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
  },
  text: {
    margin: 0,
  },
  link: {
    color: '#d5d5d5ff',
    textDecoration: 'none',
    margin: '0 6px',
  }
};

export default Footer;
