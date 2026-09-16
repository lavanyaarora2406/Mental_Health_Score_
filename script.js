(() => {
  const API_BASE = "http://127.0.0.1:2200";

  const form = document.getElementById("predictForm");
  const predictBtn = document.getElementById("predictBtn");
  const predictBtnText = document.getElementById("predictBtnText");
  const errorBox = document.getElementById("errorBox");
  const errorMessage = document.getElementById("errorMessage");
  const errorList = document.getElementById("errorList");
  const resultSection = document.getElementById("resultSection");
  const resultScore = document.getElementById("resultScore");
  const resultMessage = document.getElementById("resultMessage");
  const heroScore = document.getElementById("heroScore");
  const outputCard = document.getElementById("outputCard");
  const apiDot = document.getElementById("apiDot");
  const apiStatusText = document.getElementById("apiStatusText");

  // Readable labels for validation errors, keyed by field name.
  const FIELD_LABELS = {
    age: "Age",
    gender: "Gender",
    country: "Country",
    academic_level: "Academic level",
    most_used_platform: "Most used platform",
    purpose_of_use: "Purpose of use",
    avg_daily_usage_hours: "Avg. daily usage",
    daily_unlocks: "Daily phone unlocks",
    study_hours: "Study hours",
    physical_activity_hours: "Physical activity",
    sleep_hours_per_night: "Sleep per night",
    stress_level: "Stress level",
  };

  const NUMBER_FIELDS = new Set([
    "age",
    "avg_daily_usage_hours",
    "daily_unlocks",
    "study_hours",
    "physical_activity_hours",
    "sleep_hours_per_night",
  ]);

  const INT_FIELDS = new Set(["age", "daily_unlocks"]);

  /* ---------- API status check (once, on load) ---------- */
  async function checkApiStatus() {
    try {
      const res = await fetch(`${API_BASE}/`, { method: "GET" });
      if (res.ok) {
        setApiStatus(true);
      } else {
        setApiStatus(false);
      }
    } catch (err) {
      setApiStatus(false);
    }
  }

  function setApiStatus(online) {
    apiDot.classList.remove("online", "offline");
    apiDot.classList.add(online ? "online" : "offline");
    apiStatusText.textContent = online ? "API ONLINE" : "API OFFLINE";
  }

  /* ---------- form -> JSON payload ---------- */
  function buildPayload() {
    const formData = new FormData(form);
    const payload = {};

    for (const [key, rawValue] of formData.entries()) {
      if (NUMBER_FIELDS.has(key)) {
        const num = INT_FIELDS.has(key) ? parseInt(rawValue, 10) : parseFloat(rawValue);
        payload[key] = Number.isNaN(num) ? rawValue : num;
      } else {
        payload[key] = rawValue;
      }
    }

    return payload;
  }

  /* ---------- error rendering ---------- */
  function showError(message, fieldNames) {
    errorMessage.textContent = message;

    if (fieldNames && fieldNames.length) {
      errorList.innerHTML = "";
      fieldNames.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = FIELD_LABELS[name] || name;
        errorList.appendChild(li);
      });
      errorList.hidden = false;
    } else {
      errorList.hidden = true;
    }

    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearError() {
    errorBox.hidden = true;
    errorMessage.textContent = "";
    errorList.innerHTML = "";
  }

  // FastAPI 422 responses carry a `detail` array of {loc, msg, type}.
  function parseValidationError(body) {
    if (!body || !Array.isArray(body.detail)) return null;
    const fieldNames = body.detail
      .map((item) => (Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null))
      .filter(Boolean);
    return fieldNames;
  }

  /* ---------- result rendering ---------- */
  function showResult(score) {
    const formatted = Number(score).toFixed(2);

    resultScore.textContent = formatted;
    resultMessage.textContent =
      "Model prediction generated successfully. This is a machine-learning estimate and should not be treated as a clinical diagnosis.";
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

    heroScore.textContent = formatted;
    outputCard.classList.add("filled");
  }

  /* ---------- submit handling ---------- */
  async function handleSubmit(event) {
    event.preventDefault();
    clearError();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = buildPayload();

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 422 || res.status === 400) {
        let body = null;
        try {
          body = await res.json();
        } catch (_) {
          /* body wasn't JSON */
        }
        const fieldNames = parseValidationError(body);
        showError(
          "Please check the highlighted inputs and try again.",
          fieldNames
        );
        return;
      }

      if (res.status >= 500) {
        showError("The prediction service ran into a problem. Please try again shortly.");
        return;
      }

      if (!res.ok) {
        showError("Unable to generate a prediction. Check your inputs and make sure the API is running.");
        return;
      }

      const data = await res.json();

      if (typeof data.predicted_mental_health_score !== "number") {
        showError("The API returned an unexpected response.");
        return;
      }

      setApiStatus(true);
      showResult(data.predicted_mental_health_score);
    } catch (err) {
      setApiStatus(false);
      showError("Unable to reach the API. Make sure the backend is running on port 2200.");
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    predictBtn.disabled = isLoading;
    if (isLoading) {
      predictBtnText.innerHTML = '<span class="spinner"></span>Predicting...';
    } else {
      predictBtnText.textContent = "Predict score →";
    }
  }

  form.addEventListener("submit", handleSubmit);
  checkApiStatus();
})();
