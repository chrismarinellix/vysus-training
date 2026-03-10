/**
 * Module Renderer — drives the 5-section module template
 * Expects window.MODULE_DATA to be defined before this script loads
 * Requires training-engine.js to be loaded first
 */
(() => {
    'use strict';

    const DATA = window.MODULE_DATA;
    if (!DATA) {
        document.getElementById('content-wrap').innerHTML = '<div class="glass glass-hero"><h1>Module Not Found</h1><p>No module data loaded.</p></div>';
        return;
    }

    const SECTION_LABELS = ['Context & Scenario', 'Deep Dive', 'Practical Application', 'Advanced / Edge Cases', 'Assessment'];
    const SECTION_ICONS = ['🎯', '🔬', '🛠️', '⚠️', '📝'];
    const FEEDBACK_AFTER = [0, 2, 4];

    let currentSection = 0;
    let assessmentState = { answers: [], submitted: false };
    let timerInterval = null;

    // ── Init ──────────────────────────────────────────────────
    function init() {
        document.title = `${DATA.title} | Grid Engineering Training`;
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = document.title;
        document.getElementById('module-title-bar').textContent = DATA.title;

        // Background
        const bgContainer = document.getElementById('bg-container');
        const bgUrl = DATA.backgroundImage || 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1920&q=90';
        bgContainer.innerHTML = `<div class="bg-layer active" style="background-image:url('${bgUrl}')"></div>`;

        // Init engine
        TrainingEngine.init();
        const state = TrainingEngine.User.current();
        if (state) {
            document.getElementById('xp-display').textContent = `${state.xp} XP`;
        }

        TrainingEngine.Modules.startModule(DATA.id);
        buildSectionNav();
        renderSections();

        TrainingEngine.TimeTracker.startSection(DATA.id, 0);
        timerInterval = setInterval(updateTimer, 1000);
        showSection(0);
    }

    function buildSectionNav() {
        const nav = document.getElementById('section-nav');
        const progress = TrainingEngine.Modules.getProgress(DATA.id);
        nav.innerHTML = SECTION_LABELS.map((label, i) => {
            const completed = progress.sectionsCompleted.includes(i);
            return `<button class="section-tab ${i === 0 ? 'active' : ''} ${completed ? 'completed' : ''}"
                data-section="${i}" onclick="ModuleRenderer.showSection(${i})">${SECTION_ICONS[i]} ${label}</button>`;
        }).join('');
    }

    function showSection(index) {
        if (index < 0 || index > 4) return;
        TrainingEngine.TimeTracker.stopSection();
        currentSection = index;

        document.querySelectorAll('.section-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
        });
        document.querySelectorAll('.section-panel').forEach((panel, i) => {
            panel.classList.toggle('active', i === index);
        });

        document.getElementById('progress-fill').style.width = `${((index + 1) / 5) * 100}%`;
        TrainingEngine.TimeTracker.startSection(DATA.id, index);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderSections() {
        const wrap = document.getElementById('content-wrap');
        let html = '';

        for (let i = 0; i < 4; i++) {
            const section = DATA.sections[i];
            if (!section) continue;

            html += `<div class="section-panel ${i === 0 ? 'active' : ''}" id="section-${i}">`;
            html += `<div class="glass glass-hero">
                <h1>${section.title}</h1>
                <p class="tagline">${SECTION_LABELS[i]}</p>
                <p class="subtitle">${section.subtitle || ''}</p>
            </div>`;

            html += renderContentBlocks(section.content);

            if (section.checks && section.checks[0]) {
                html += renderKnowledgeCheck(i, 0, section.checks[0]);
            }

            if (section.contentAfterCheck1) {
                html += renderContentBlocks(section.contentAfterCheck1);
            }

            if (section.checks && section.checks[1]) {
                html += renderKnowledgeCheck(i, 1, section.checks[1]);
            }

            if (FEEDBACK_AFTER.includes(i) && i < 4) {
                html += renderFeedbackHotspot(i);
            }

            html += `<div class="section-end-nav">
                ${i > 0 ? `<button class="btn btn-secondary" onclick="ModuleRenderer.showSection(${i - 1})">← Previous</button>` : '<span></span>'}
                <button class="btn btn-primary" onclick="ModuleRenderer.completeAndAdvance(${i})">
                    ${i < 3 ? 'Continue →' : 'Go to Assessment →'}
                </button>
            </div>`;
            html += '</div>';
        }

        html += renderAssessment();
        wrap.innerHTML = html;
    }

    function renderContentBlocks(blocks) {
        if (!blocks) return '';
        let html = '';
        blocks.forEach(block => {
            switch (block.type) {
                case 'card': html += `<div class="glass"><div class="content-section">${block.html}</div></div>`; break;
                case 'info': html += `<div class="box-info"><h4>${block.title || 'Note'}</h4><p>${block.text}</p></div>`; break;
                case 'success': html += `<div class="box-success"><h4>${block.title || 'Key Point'}</h4><p>${block.text}</p></div>`; break;
                case 'warning': html += `<div class="box-warn"><h4>${block.title || 'Warning'}</h4><p>${block.text}</p></div>`; break;
                case 'tech': html += `<div class="box-tech"><h4>${block.title || 'Technical Detail'}</h4><p>${block.text}</p></div>`; break;
                case 'mentor': html += `<div class="box-mentor"><h4>${block.title || 'Mentor Tip'}</h4><p>${block.text}</p></div>`; break;
                case 'html': html += block.html; break;
                default: html += `<div class="glass">${block.html || block.text || ''}</div>`;
            }
        });
        return html;
    }

    function renderKnowledgeCheck(sectionIndex, checkIndex, check) {
        const id = `kc-${sectionIndex}-${checkIndex}`;
        const progress = TrainingEngine.Modules.getProgress(DATA.id);
        const key = `s${sectionIndex}_c${checkIndex}`;
        const answered = progress.formativeScores[key] !== undefined;

        return `
        <div class="knowledge-check" id="${id}">
            <div class="kc-header">
                <span class="kc-icon">🧠</span>
                <span class="kc-label">Knowledge Check</span>
                <span class="kc-xp">+${TrainingEngine.CONFIG.FORMATIVE_XP} XP</span>
            </div>
            <div class="kc-question">${check.question}</div>
            <div class="kc-options">
                ${check.options.map((opt, oi) => `
                    <div class="kc-option ${answered ? 'disabled' : ''} ${answered && oi === check.correct ? 'correct' : ''}"
                        data-kc="${id}" data-index="${oi}" data-correct="${check.correct}"
                        onclick="ModuleRenderer.answerKC('${id}', ${sectionIndex}, ${checkIndex}, ${oi}, ${check.correct})">
                        ${opt}
                    </div>
                `).join('')}
            </div>
            <div class="kc-feedback" id="${id}-feedback"></div>
        </div>`;
    }

    function answerKC(kcId, sectionIndex, checkIndex, selected, correct) {
        const container = document.getElementById(kcId);
        if (!container) return;

        const options = container.querySelectorAll('.kc-option');
        const isCorrect = selected === correct;

        options.forEach((opt, i) => {
            opt.classList.add('disabled');
            if (i === correct) opt.classList.add('correct');
            if (i === selected && !isCorrect) opt.classList.add('incorrect');
        });

        const fb = document.getElementById(`${kcId}-feedback`);
        if (fb) {
            fb.className = `kc-feedback show ${isCorrect ? 'correct-fb' : 'incorrect-fb'}`;
            const check = DATA.sections[sectionIndex]?.checks?.[checkIndex];
            fb.textContent = isCorrect
                ? (check?.correctFeedback || 'Correct! Well done.')
                : (check?.incorrectFeedback || `Not quite. The correct answer was: ${check?.options[correct]}`);
        }

        TrainingEngine.Modules.recordFormative(DATA.id, sectionIndex, checkIndex, isCorrect);
        if (isCorrect) {
            TrainingEngine.UI.showNotification(`+${TrainingEngine.CONFIG.FORMATIVE_XP} XP — Knowledge check correct!`, 'xp');
            updateXPDisplay();
        }
    }

    function renderFeedbackHotspot(sectionIndex) {
        const id = `feedback-${sectionIndex}`;
        return `
        <div class="feedback-hotspot" id="${id}">
            <h4>💬 How's This Section?</h4>
            <p>Your feedback helps us improve this training content (+${TrainingEngine.CONFIG.FEEDBACK_XP} XP).</p>
            <div class="feedback-stars" id="${id}-stars">
                ${[1,2,3,4,5].map(n => `<span class="feedback-star" data-rating="${n}" onclick="ModuleRenderer.setRating('${id}', ${n})">⭐</span>`).join('')}
            </div>
            <textarea class="feedback-textarea" id="${id}-text" placeholder="What worked well? What could be improved?"></textarea>
            <br>
            <button class="feedback-submit" onclick="ModuleRenderer.submitFeedback('${id}', ${sectionIndex})">Submit Feedback</button>
            <div class="feedback-submitted" id="${id}-done">✓ Feedback submitted — thank you!</div>
        </div>`;
    }

    function setRating(hotspotId, rating) {
        const stars = document.querySelectorAll(`#${hotspotId}-stars .feedback-star`);
        stars.forEach((star, i) => star.classList.toggle('active', i < rating));
        document.getElementById(hotspotId).dataset.rating = rating;
    }

    function submitFeedback(hotspotId, sectionIndex) {
        const container = document.getElementById(hotspotId);
        const text = document.getElementById(`${hotspotId}-text`).value;
        const rating = parseInt(container.dataset.rating) || 0;
        if (!text.trim() && !rating) return;

        TrainingEngine.Feedback.submit(DATA.id, sectionIndex, text || '(rating only)', rating);
        TrainingEngine.UI.showNotification(`+${TrainingEngine.CONFIG.FEEDBACK_XP} XP — Thanks for your feedback!`, 'badge');
        container.querySelector('.feedback-submit').style.display = 'none';
        container.querySelector('.feedback-submitted').style.display = 'block';
        container.querySelector('.feedback-textarea').disabled = true;
        updateXPDisplay();
    }

    function renderAssessment() {
        const questions = DATA.assessment || [];
        return `
        <div class="section-panel" id="section-4">
            <div class="glass glass-hero">
                <h1>Final Assessment</h1>
                <p class="tagline">${questions.length} Questions · ${Math.round(TrainingEngine.CONFIG.PASS_THRESHOLD * 100)}% Pass Mark</p>
                <p class="subtitle">${DATA.title}</p>
            </div>
            <div class="assessment-container" id="assessment-questions">
                ${questions.map((q, qi) => `
                <div class="glass quiz-card">
                    <div class="question-number">Question ${qi + 1} of ${questions.length}</div>
                    <div class="question-text">${q.question}</div>
                    <div class="answer-options">
                        ${q.options.map((opt, oi) => `
                            <div class="answer-option" data-q="${qi}" data-o="${oi}"
                                onclick="ModuleRenderer.selectAnswer(${qi}, ${oi})">
                                <span class="opt-letter">${String.fromCharCode(65 + oi)}</span>
                                <span>${opt}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                `).join('')}
                ${renderFeedbackHotspot(4)}
                <div style="text-align:center; margin: 2rem 0;">
                    <button class="btn btn-primary" onclick="ModuleRenderer.submitAssessment()" id="submit-assessment-btn"
                        style="font-size:1.1rem; padding:1rem 3rem;">Submit Assessment</button>
                </div>
            </div>
            <div class="glass results-card" id="results-card" style="display:none;">
                <div id="results-content"></div>
            </div>
        </div>`;
    }

    function selectAnswer(qIndex, oIndex) {
        if (assessmentState.submitted) return;
        assessmentState.answers[qIndex] = oIndex;
        document.querySelectorAll(`.answer-option[data-q="${qIndex}"]`).forEach((opt, i) => {
            opt.classList.toggle('selected', i === oIndex);
        });
    }

    function submitAssessment() {
        if (assessmentState.submitted) return;
        const questions = DATA.assessment || [];

        const unanswered = questions.filter((_, i) => assessmentState.answers[i] === undefined);
        if (unanswered.length > 0) {
            TrainingEngine.UI.showNotification(`Please answer all ${questions.length} questions before submitting.`, 'warning');
            return;
        }

        assessmentState.submitted = true;

        let correct = 0;
        questions.forEach((q, i) => {
            if (assessmentState.answers[i] === q.correct) correct++;
        });
        const scorePercent = Math.round((correct / questions.length) * 100);
        const result = TrainingEngine.Modules.completeAssessment(DATA.id, scorePercent, assessmentState.answers);

        TrainingEngine.TimeTracker.stopSection();
        clearInterval(timerInterval);
        TrainingEngine.Modules.completeSection(DATA.id, 4);

        document.getElementById('assessment-questions').style.display = 'none';
        const resultsCard = document.getElementById('results-card');
        resultsCard.style.display = 'block';

        let resultsHTML = `
            <h2 style="font-size:2rem; margin-bottom:0.5rem;">Assessment Complete</h2>
            <div class="score-circle ${result.passed ? 'pass' : 'fail'}">
                ${scorePercent}%<small>${correct}/${questions.length}</small>
            </div>
            <h3 style="margin:1rem 0; color:${result.passed ? 'var(--stockholm-neon)' : 'var(--orlando-red)'}">
                ${result.passed ? '✓ Passed!' : '✗ Not Passed — 70% Required'}
            </h3>`;

        if (result.passed && result.xpAwarded) {
            resultsHTML += `<div class="xp-awarded">⚡ +${result.xpAwarded.xp} XP earned${scorePercent === 100 ? ' (Perfect Score Bonus!)' : ''}</div>`;
        }
        if (result.newBadges && result.newBadges.length > 0) {
            result.newBadges.forEach(b => {
                resultsHTML += `<div class="badge-earned">${b.icon} Badge: ${b.name}</div>`;
                TrainingEngine.UI.showBadgeEarned(b);
            });
        }
        if (result.xpAwarded?.leveledUp) {
            resultsHTML += `<div class="xp-awarded" style="border-color:gold;background:rgba(255,215,0,0.1);">
                ${result.xpAwarded.level.icon} Level Up! ${result.xpAwarded.level.name}</div>`;
            TrainingEngine.UI.showLevelUp(result.xpAwarded.level);
        }

        resultsHTML += `<div class="btn-group" style="margin-top:2rem;">
            ${!result.passed ? '<button class="btn btn-secondary" onclick="ModuleRenderer.retakeAssessment()">Retake Assessment</button>' : ''}
            <button class="btn btn-primary" onclick="window.location.href='../../index.html'">Back to Portal</button>
        </div>`;

        document.getElementById('results-content').innerHTML = resultsHTML;
        updateXPDisplay();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function retakeAssessment() {
        assessmentState = { answers: [], submitted: false };
        document.getElementById('assessment-questions').style.display = 'block';
        document.getElementById('results-card').style.display = 'none';
        document.querySelectorAll('.answer-option').forEach(opt => opt.classList.remove('selected'));
        TrainingEngine.TimeTracker.startSection(DATA.id, 4);
        timerInterval = setInterval(updateTimer, 1000);
    }

    function completeAndAdvance(sectionIndex) {
        TrainingEngine.Modules.completeSection(DATA.id, sectionIndex);
        const tabs = document.querySelectorAll('.section-tab');
        if (tabs[sectionIndex]) tabs[sectionIndex].classList.add('completed');
        showSection(sectionIndex + 1);
    }

    function updateTimer() {
        const elapsed = TrainingEngine.TimeTracker.getElapsed();
        document.getElementById('timer-display').textContent = TrainingEngine.TimeTracker.formatTime(elapsed);
    }

    function updateXPDisplay() {
        const state = TrainingEngine.User.current();
        if (state) document.getElementById('xp-display').textContent = `${state.xp} XP`;
    }

    // Expose
    window.ModuleRenderer = {
        showSection, answerKC, setRating, submitFeedback,
        selectAnswer, submitAssessment, retakeAssessment, completeAndAdvance
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
