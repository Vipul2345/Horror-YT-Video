// Nightfall AI Horror Video Automation - Frontend Logic
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('generator-form');
  const topicInput = document.getElementById('topic');
  const triggerTypeSelect = document.getElementById('trigger-type');
  const patInputGroup = document.getElementById('pat-input-group');
  const webhookInputGroup = document.getElementById('webhook-input-group');
  const sessionPatInput = document.getElementById('session-pat');
  const webhookUrlInput = document.getElementById('webhook-url');
  
  const configSection = document.getElementById('config-section');
  const jobSection = document.getElementById('job-section');
  const jobIdText = document.getElementById('job-id-text');
  const jobStatusPill = document.getElementById('job-status-pill');
  const jobElapsedTicker = document.getElementById('job-elapsed');
  const visualsProgressSub = document.getElementById('visuals-progress-sub');
  const consoleOutput = document.getElementById('console-output');
  const completionBox = document.getElementById('completion-box');
  const linkDownload = document.getElementById('link-download');
  const linkYoutube = document.getElementById('link-youtube');
  const btnNewVideo = document.getElementById('btn-new-video');
  const btnCopyLogs = document.getElementById('btn-copy-logs');

  let pollInterval = null;
  let timerInterval = null;
  let startTime = null;
  let activeJobId = null;

  // Restore stored session token if available
  if (sessionStorage.getItem('gh_session_pat')) {
    sessionPatInput.value = sessionStorage.getItem('gh_session_pat');
  }

  // Quick idea sample buttons
  document.querySelectorAll('.btn-sample').forEach(btn => {
    btn.addEventListener('click', () => {
      topicInput.value = btn.getAttribute('data-sample');
      topicInput.focus();
    });
  });

  // Toggle trigger setting fields
  triggerTypeSelect.addEventListener('change', () => {
    const val = triggerTypeSelect.value;
    patInputGroup.style.display = (val === 'direct-pat') ? 'block' : 'none';
    webhookInputGroup.style.display = (val === 'webhook') ? 'block' : 'none';
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const topic = topicInput.value.trim();
    if (!topic) {
      alert('Please enter a horror topic.');
      return;
    }

    const payload = {
      job_id: `JOB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      topic,
      duration: parseInt(document.getElementById('duration').value, 10),
      voice: document.getElementById('voice').value,
      visual_mode: document.getElementById('visual-mode').value,
      quality_mode: document.getElementById('quality-mode').value,
      music: document.getElementById('toggle-music').checked,
      sfx: document.getElementById('toggle-sfx').checked,
      captions: document.getElementById('toggle-captions').checked,
      youtube: document.getElementById('toggle-youtube').checked,
      created_at: new Date().toISOString()
    };

    activeJobId = payload.job_id;
    const triggerMethod = triggerTypeSelect.value;

    if (triggerMethod === 'direct-pat') {
      const pat = sessionPatInput.value.trim();
      if (!pat) {
        alert('Please enter your session Personal Access Token to trigger directly via GitHub API.');
        return;
      }
      sessionStorage.setItem('gh_session_pat', pat);
      await triggerGitHubActions(pat, payload);
    } else if (triggerMethod === 'webhook') {
      const webhookUrl = webhookUrlInput.value.trim();
      if (!webhookUrl) {
        alert('Please enter your webhook trigger URL.');
        return;
      }
      await triggerWebhook(webhookUrl, payload);
    } else if (triggerMethod === 'manual') {
      const actionsUrl = `https://github.com/Vipul2345/Horror-YT-Video/actions/workflows/generate-video.yml`;
      window.open(actionsUrl, '_blank');
      alert(`Topic copied! Open GitHub Actions to run workflow with parameters:\nTopic: ${payload.topic}`);
    } else {
      // Local development trigger
      await triggerLocal(payload);
    }

    showJobView(payload.job_id);
  });

  function showJobView(jobId) {
    configSection.style.display = 'none';
    jobSection.style.display = 'block';
    jobIdText.textContent = jobId;
    jobStatusPill.textContent = 'RUNNING';
    jobStatusPill.style.background = '#ff9800';
    jobStatusPill.style.color = '#000';
    completionBox.style.display = 'none';
    consoleOutput.textContent = `[${new Date().toLocaleTimeString()}] Generation initiated for ${jobId}...\n`;

    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);

    setStepActive('INIT');
    startPolling(jobId);
  }

  function updateTimer() {
    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
    const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');
    jobElapsedTicker.textContent = `${mins}:${secs}`;
  }

  // Trigger via GitHub Actions REST API
  async function triggerGitHubActions(pat, payload) {
    try {
      appendLog(`Dispatching workflow to GitHub Actions (Vipul2345/Horror-YT-Video)...`);
      const resp = await fetch('https://api.github.com/repos/Vipul2345/Horror-YT-Video/actions/workflows/generate-video.yml/dispatches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            job_id: payload.job_id,
            topic: payload.topic,
            duration: String(payload.duration),
            voice: payload.voice,
            visual_mode: payload.visual_mode,
            quality_mode: payload.quality_mode
          }
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`GitHub API error (${resp.status}): ${errText}`);
      }
      appendLog(`✓ Workflow dispatch successful! Worker started on GitHub Actions.`);
    } catch (err) {
      appendLog(`❌ Error triggering GitHub Actions: ${err.message}`);
      jobStatusPill.textContent = 'DISPATCH FAILED';
      jobStatusPill.style.background = '#f44336';
      jobStatusPill.style.color = '#fff';
    }
  }

  // Trigger via Webhook Proxy
  async function triggerWebhook(url, payload) {
    try {
      appendLog(`Triggering secure webhook at ${url}...`);
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`Webhook responded with status ${resp.status}`);
      appendLog(`✓ Webhook accepted job request.`);
    } catch (err) {
      appendLog(`❌ Webhook trigger error: ${err.message}`);
    }
  }

  // Trigger via Local Development server (if active)
  async function triggerLocal(payload) {
    appendLog(`Running in local mode. Ensure 'npm run generate -- --topic="..."' is running or start mock polling.`);
    appendLog(`Job ID: ${payload.job_id}`);
    try {
      const resp = await fetch(`/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        appendLog(`✓ Local generation worker received job.`);
      }
    } catch {
      // Local dev endpoint not running, fallback to polling status file
      appendLog(`Local worker endpoint not detected. Polling for job output file directly.`);
    }
  }

  // Real Status Polling
  function startPolling(jobId) {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      try {
        // Attempt to fetch real status from jobs directory or raw github status
        const endpoints = [
          `/jobs/${jobId}/status.json`,
          `../jobs/${jobId}/status.json`,
          `https://raw.githubusercontent.com/Vipul2345/Horror-YT-Video/gh-pages/jobs/${jobId}/status.json`
        ];

        let statusData = null;
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, { cache: 'no-store' });
            if (res.ok) {
              statusData = await res.json();
              break;
            }
          } catch {}
        }

        if (statusData) {
          handleStatusUpdate(statusData);
        }
      } catch (e) {
        console.warn('Status poll attempt:', e);
      }
    }, 3000);
  }

  function handleStatusUpdate(data) {
    if (data.status) {
      jobStatusPill.textContent = data.status;
    }

    if (data.message) {
      appendLog(`[STATUS] ${data.message}`);
    }

    if (data.current_step) {
      setStepDoneUpTo(data.current_step);
      setStepActive(data.current_step);
    }

    if (data.current_scene && data.total_scenes) {
      visualsProgressSub.textContent = `Scene ${data.current_scene} of ${data.total_scenes}`;
    }

    if (data.status === 'COMPLETED' || data.status === 'SUCCESS') {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
      markAllStepsDone();
      jobStatusPill.textContent = 'COMPLETED';
      jobStatusPill.style.background = '#00e676';
      jobStatusPill.style.color = '#000';
      completionBox.style.display = 'block';

      if (data.video_path) {
        linkDownload.href = data.video_path;
        linkDownload.style.display = 'inline-flex';
      }
      if (data.youtube_url) {
        linkYoutube.href = data.youtube_url;
        linkYoutube.style.display = 'inline-flex';
      }
    } else if (data.status === 'FAILED') {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
      jobStatusPill.textContent = 'FAILED';
      jobStatusPill.style.background = '#f44336';
      jobStatusPill.style.color = '#fff';
      appendLog(`❌ Pipeline failed: ${data.error || 'Unknown error'}`);
    }
  }

  function appendLog(text) {
    const time = new Date().toLocaleTimeString();
    consoleOutput.textContent += `[${time}] ${text}\n`;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function setStepActive(stepName) {
    document.querySelectorAll('.step-item').forEach(el => {
      if (el.getAttribute('data-step') === stepName) {
        el.classList.add('active');
        el.classList.remove('done');
      }
    });
  }

  function setStepDoneUpTo(stepName) {
    const order = ['INIT', 'STORY', 'CHARACTERS', 'SCENES', 'VOICE', 'VISUALS', 'AUDIO_MIX', 'CAPTIONS', 'RENDERING', 'QA', 'YOUTUBE'];
    const idx = order.indexOf(stepName);
    if (idx === -1) return;

    order.forEach((step, i) => {
      const el = document.querySelector(`.step-item[data-step="${step}"]`);
      if (el) {
        if (i < idx) {
          el.classList.add('done');
          el.classList.remove('active');
        }
      }
    });
  }

  function markAllStepsDone() {
    document.querySelectorAll('.step-item').forEach(el => {
      el.classList.add('done');
      el.classList.remove('active');
    });
  }

  // Copy logs
  btnCopyLogs.addEventListener('click', () => {
    navigator.clipboard.writeText(consoleOutput.textContent);
    btnCopyLogs.textContent = 'Copied!';
    setTimeout(() => { btnCopyLogs.textContent = 'Copy Logs'; }, 2000);
  });

  // Create another video
  btnNewVideo.addEventListener('click', () => {
    jobSection.style.display = 'none';
    configSection.style.display = 'block';
    if (pollInterval) clearInterval(pollInterval);
    if (timerInterval) clearInterval(timerInterval);
  });
});
