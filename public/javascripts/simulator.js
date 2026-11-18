(function () {
  "use strict";

  const elements = {
    token: document.querySelector("#token"),
    type: document.querySelector("#type"),
    apply: document.querySelector("#apply"),
    run: document.querySelector("#run"),
    inspect: document.querySelector("#inspect"),
    reset: document.querySelector("#reset"),
    automaticStart: document.querySelector("#automatic-start"),
    automaticStop: document.querySelector("#automatic-stop"),
    automaticProgress: document.querySelector("#automatic-progress"),
    automaticCountdown: document.querySelector("#automatic-countdown"),
    automaticLast: document.querySelector("#automatic-last"),
    pushBadge: document.querySelector("#push-badge"),
    output: document.querySelector("#output"),
    year: document.querySelector("#year"),
    firebasePath: document.querySelector("#firebase-path"),
    currentScenario: document.querySelector("#current-scenario"),
    currentTitle: document.querySelector("#current-title"),
    currentStatus: document.querySelector("#current-status"),
    sourceLink: document.querySelector("#source-link"),
    apiLink: document.querySelector("#api-link"),
    toast: document.querySelector("#toast"),
  };

  let state = null;
  elements.token.value = sessionStorage.getItem("lotterySimulatorToken") || "";

  function selectedScenario() {
    return document.querySelector("input[name='scenario']:checked").value;
  }

  function selectScenario(value) {
    const input = document.querySelector(`input[name='scenario'][value='${value}']`);
    if (input) input.checked = true;
  }

  function sourceName(type) {
    return type === "navidad" ? "loteria-navidad" : "loteria-nino";
  }

  function toast(message, isError) {
    elements.toast.textContent = message;
    elements.toast.classList.toggle("error", Boolean(isError));
    elements.toast.classList.add("visible");
    window.clearTimeout(toast.timeout);
    toast.timeout = window.setTimeout(function () {
      elements.toast.classList.remove("visible");
    }, 3600);
  }

  function print(value) {
    elements.output.textContent = JSON.stringify(value, null, 2);
  }

  function token() {
    const value = elements.token.value.trim();
    if (!value) throw new Error("Introduce el token del simulador");
    sessionStorage.setItem("lotterySimulatorToken", value);
    return value;
  }

  async function request(path, options) {
    const settings = Object.assign({}, options || {});
    settings.headers = Object.assign(
      { "Content-Type": "application/json", "x-simulator-token": token() },
      settings.headers || {}
    );
    const response = await fetch(path, settings);
    const value = await response.json();
    if (!response.ok) throw new Error(value.message || `HTTP ${response.status}`);
    return value;
  }

  async function withBusy(button, operation) {
    button.disabled = true;
    try {
      await operation();
    } catch (error) {
      print({ error: error.message });
      toast(error.message, true);
    } finally {
      button.disabled = false;
      renderAutomatic();
    }
  }

  function countdown(nextAt) {
    if (!nextAt) return "—";
    const seconds = Math.max(0, Math.ceil((new Date(nextAt).getTime() - Date.now()) / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function renderAutomatic() {
    if (!state) return;
    const automatic = state.types[elements.type.value].automatic;
    elements.automaticProgress.textContent = automatic.total
      ? `${automatic.revealed} / ${automatic.total}`
      : "Sin iniciar";
    elements.automaticCountdown.textContent = automatic.running
      ? countdown(automatic.nextAt)
      : automatic.completedAt
        ? "Finalizado"
        : "—";
    elements.automaticLast.textContent = automatic.lastPrize
      ? automatic.lastPrize.number
      : "—";
    elements.automaticStart.disabled = automatic.running;
    elements.automaticStop.disabled = !automatic.running;
  }

  function renderPushState() {
    if (!state) return;
    elements.pushBadge.classList.toggle(
      "ready",
      state.pushesEnabled && state.pushesConfigured
    );
    elements.pushBadge.classList.toggle(
      "warning",
      !state.pushesEnabled || !state.pushesConfigured
    );
    elements.pushBadge.textContent = state.pushesEnabled && state.pushesConfigured
      ? "Notificaciones listas"
      : "Notificaciones pendientes";
  }

  function renderState() {
    if (!state) return;
    const type = elements.type.value;
    const current = state.types[type];
    elements.year.textContent = current.year;
    elements.firebasePath.textContent = current.firebasePath;
    elements.currentScenario.textContent = current.scenario;
    elements.currentTitle.textContent = type === "navidad" ? "Lotería de Navidad" : "Lotería del Niño";
    elements.currentStatus.classList.toggle("active", current.scenario !== "pending");
    elements.sourceLink.href = `/simulador/fuente/${sourceName(type)}/`;
    elements.apiLink.href = `/premios?type=${type}`;
    selectScenario(current.scenario);
    renderAutomatic();
    renderPushState();
  }

  async function loadState() {
    const response = await fetch("/simulador/api/state");
    state = await response.json();
    renderState();
  }

  elements.type.addEventListener("change", renderState);
  elements.token.addEventListener("change", function () {
    sessionStorage.setItem("lotterySimulatorToken", elements.token.value.trim());
  });

  elements.apply.addEventListener("click", function () {
    withBusy(elements.apply, async function () {
      const type = elements.type.value;
      const scenario = selectedScenario();
      const value = await request("/simulador/api/scenario", {
        method: "POST",
        body: JSON.stringify({ type, scenario }),
      });
      state.types[type].scenario = scenario;
      renderState();
      print(value);
      toast("Escenario publicado. Ya puedes abrir la fuente simulada.");
    });
  });

  elements.run.addEventListener("click", function () {
    withBusy(elements.run, async function () {
      const type = elements.type.value;
      const scenario = selectedScenario();
      const value = await request("/simulador/api/run", {
        method: "POST",
        body: JSON.stringify({ type, scenario }),
      });
      state.types[type].scenario = scenario;
      renderState();
      print(value);
      toast("Lectura completada y guardada en Firebase dev.");
    });
  });

  elements.automaticStart.addEventListener("click", function () {
    withBusy(elements.automaticStart, async function () {
      const type = elements.type.value;
      const value = await request("/simulador/api/automatic/start", {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      await loadState();
      print(value);
      toast("Primer premio publicado. El siguiente llegará en 2 minutos.");
    });
  });

  elements.automaticStop.addEventListener("click", function () {
    withBusy(elements.automaticStop, async function () {
      const type = elements.type.value;
      const value = await request("/simulador/api/automatic/stop", {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      await loadState();
      print(value);
      toast("Simulación automática detenida.");
    });
  });

  elements.inspect.addEventListener("click", function () {
    withBusy(elements.inspect, async function () {
      const value = await request(`/simulador/api/firebase?type=${elements.type.value}`);
      print(value);
      toast("Datos leídos desde Firebase.");
    });
  });

  elements.reset.addEventListener("click", function () {
    if (!window.confirm("¿Vaciar los resultados de desarrollo de este sorteo?")) return;
    withBusy(elements.reset, async function () {
      const type = elements.type.value;
      const value = await request("/simulador/api/reset", {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      state.types[type].scenario = "pending";
      renderState();
      print(value);
      toast("Rama dev y caché reiniciadas.");
    });
  });

  loadState().catch(function (error) {
    print({ error: error.message });
    toast(error.message, true);
  });

  window.setInterval(renderAutomatic, 1000);
  window.setInterval(function () {
    loadState().catch(function () {});
  }, 10000);
})();
