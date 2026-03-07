// Resume Data
const resumeData = __RESUME_DATA__;

// DOM Elements
const heroName = document.getElementById("hero-name");
const heroProgram = document.getElementById("hero-program");
const heroRoll = document.getElementById("hero-roll");
const profileImage = document.getElementById("profile-image");
const socialLinks = document.getElementById("social-links");
const sectionsContainer = document.getElementById("sections");
const contactInfo = document.getElementById("contact-info");
const footerName = document.getElementById("footer-name");
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");

// Initialize the portfolio
function initializePortfolio() {
  setupHeroSection();
  generateSections();
  setupContactSection();
  setupFooter();
  setupNavigation();
  setupScrollAnimations();
  updateDocumentTitle();
}

// Setup Hero Section
function setupHeroSection() {
  const { personalInfo } = resumeData;

  heroName.textContent = personalInfo.name;
  heroProgram.textContent = personalInfo.program;
  heroRoll.textContent = `Roll No: ${personalInfo.rollNo}`;
  profileImage.src = personalInfo.profilePicture;
  profileImage.alt = `${personalInfo.name} - Profile Picture`;

  // Create social links
  const links = [
    {
      icon: "fas fa-envelope",
      text: "Email",
      href: `mailto:${personalInfo.email}`,
      label: personalInfo.email,
    },
    {
      icon: "fab fa-linkedin",
      text: "LinkedIn",
      href: `https://linkedin.com/in/${personalInfo.linkedin}`,
      label: "LinkedIn",
    },
    {
      icon: "fab fa-github",
      text: "GitHub",
      href: `https://github.com/${personalInfo.github}`,
      label: "GitHub",
    },
  ];

  socialLinks.innerHTML = links
    .map(
      (link) => `
        <a href="${link.href}" class="social-link" target="_blank" rel="noopener noreferrer">
            <i class="${link.icon}"></i>
            <span>${link.text}</span>
        </a>
    `
    )
    .join("");
}

// Generate Sections Dynamically
function generateSections() {
  const { sectionorder } = resumeData;

  sectionsContainer.innerHTML = sectionorder
    .filter((section) => {
      const data = resumeData[section.id];
      return data && Array.isArray(data) && data.length > 0;
    })
    .map((section) => {
      const data = resumeData[section.id];
      return createSection(section.id, section.title, data);
    })
    .join("");
}

// Create Section HTML
function createSection(sectionId, title, data) {
  const sectionClass = sectionId === "skills" ? "skills-section" : "section";

  return `
        <section id="${sectionId}" class="${sectionClass}">
            <div class="section-header">
                <h2 class="section-title">${title}</h2>
                <div class="section-line"></div>
            </div>
            <div class="section-content">
                ${generateSectionContent(sectionId, data)}
            </div>
        </section>
    `;
}

// Generate Section Content
function generateSectionContent(sectionId, data) {
  switch (sectionId) {
    case "skills":
      return `
                <div class="skills-grid">
                    ${data
                      .map(
                        (skill) => `
                        <div class="skill-item">
                            <h3 class="skill-title">${skill.title}</h3>
                            <p class="skill-description">${skill.description}</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `;

    case "education":
      return `
                <div class="cards-grid">
                    ${data
                      .map(
                        (item) => `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">${item.degree}</h3>
                                <span class="card-meta">${item.year}</span>
                            </div>
                            <p class="card-subtitle">${item.institute}</p>
                            <p class="card-description">CGPA/Percentage: ${item.cgpa}</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `;

    case "projects":
      return `
                <div class="cards-grid">
                    ${data
                      .map(
                        (project) => `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">${project.title}</h3>
                                <span class="card-meta">${
                                  project.duration
                                }</span>
                            </div>
                            <p class="card-description">${
                              project.description
                            }</p>
                            ${
                              project.url
                                ? `
                                <a href="${project.url}" class="card-link" target="_blank" rel="noopener noreferrer">
                                    <i class="fas fa-external-link-alt"></i>
                                    View Project
                                </a>
                            `
                                : ""
                            }
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `;

    case "internships":
      return `
                <div class="cards-grid">
                    ${data
                      .map(
                        (internship) => `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">${internship.title}</h3>
                                <span class="card-meta">${internship.duration}</span>
                            </div>
                            <p class="card-subtitle">${internship.company}</p>
                            <p class="card-description">${internship.description}</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `;

    case "position":
      return `
                <div class="cards-grid">
                    ${data
                      .map(
                        (pos) => `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">${pos.title}</h3>
                                <span class="card-meta">${pos.time}</span>
                            </div>
                            <p class="card-description">${pos.description}</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `;

    case "awards":
      return `
                <div class="cards-grid">
                    ${data
                      .map(
                        (award, index) => `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">${
                                  award.title || `Achievement ${index + 1}`
                                }</h3>
                            </div>
                            <p class="card-description">${award.description}</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `;

    case "coursework":
      return `
                <div class="skills-grid">
                    ${data
                      .map(
                        (course) => `
                        <div class="skill-item">
                            <h3 class="skill-title">${course.title}</h3>
                            <p class="skill-description">${course.description}</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `;

    default:
      return `
                <div class="cards-grid">
                    ${data
                      .map(
                        (item, index) => `
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">${
                                  item.title || `Item ${index + 1}`
                                }</h3>
                            </div>
                            <p class="card-description">${item.description}</p>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `;
  }
}

// Setup Contact Section
function setupContactSection() {
  const { personalInfo } = resumeData;

  const contactItems = [
    {
      icon: "fas fa-envelope",
      text: personalInfo.email,
      href: `mailto:${personalInfo.email}`,
    },
    {
      icon: "fas fa-phone",
      text: personalInfo.contact,
      href: `tel:${personalInfo.contact}`,
    },
  ];

  contactInfo.innerHTML = contactItems
    .map(
      (item) => `
        <a href="${item.href}" class="contact-item">
            <i class="${item.icon}"></i>
            <span>${item.text}</span>
        </a>
    `
    )
    .join("");
}

// Setup Footer
function setupFooter() {
  footerName.textContent = resumeData.personalInfo.name;
}

// Setup Navigation
function setupNavigation() {
  navToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });

  // Close mobile menu when clicking on a link
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
    });
  });

  // Smooth scroll for navigation links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        const offsetTop = target.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });
      }
    });
  });
}

// Setup Scroll Animations
function setupScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, observerOptions);

  // Observe all sections
  document.querySelectorAll(".section, .skills-section").forEach((section) => {
    observer.observe(section);
  });

  // Navbar background on scroll
  window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar");
    if (window.scrollY > 100) {
      navbar.style.background = "rgba(10, 14, 39, 0.98)";
    } else {
      navbar.style.background = "rgba(10, 14, 39, 0.95)";
    }
  });
}

// Update document title
function updateDocumentTitle() {
  document.title = `Portfolio - ${resumeData.personalInfo.name}`;
}

// Add loading class initially and remove after content loads
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("loading");

  setTimeout(() => {
    initializePortfolio();
    document.body.classList.remove("loading");

    // Add fade-in animation to main content
    document.querySelector(".main-content").classList.add("fade-in");
  }, 500);
});

// Handle image loading errors
document.addEventListener("DOMContentLoaded", () => {
  const profileImg = document.getElementById("profile-image");
  profileImg.addEventListener("error", () => {
    // Fallback to a default avatar if image fails to load
    profileImg.src =
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face";
  });
});
