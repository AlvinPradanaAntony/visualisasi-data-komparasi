// Workspace.js - Script for handling workspace drag & drop functionality
document.addEventListener("DOMContentLoaded", function () {
  // --- Variabel & Element References ---
  const modelCardsContainer = document.getElementById("modelCardsContainer");
  const modelDropContainer = document.getElementById("modelDropContainer");
  const droppedModelsContainer = document.getElementById("droppedModelsContainer");
  const emptyDropState = document.getElementById("emptyDropState");
  const generateWorkspaceChartBtn = document.getElementById("generateWorkspaceChartBtn");
  const resetWorkspaceBtn = document.getElementById("resetWorkspaceBtn");
  const workspaceChartContainer = document.getElementById("workspaceChartContainer");
  const workspaceChart = document.getElementById("workspaceChart");

  // Preloader element
  const preloaderElement = document.getElementById("preloader");

  // Track dropped models
  let droppedModels = [];
  let availableModels = [];
  let fusionChartInstanceWorkspace = null;

  // --- Initialize Firebase from Main Script ---
  // This is reusing the Firebase initialization and configuration from script.js

  // --- Preloader Management ---
  window.addEventListener("load", function () {
    // Hide preloader
    setTimeout(() => {
      if (preloaderElement) {
        preloaderElement.style.opacity = "0";
        setTimeout(() => {
          preloaderElement.style.display = "none";
        }, 500);
      }
    }, 500);
  });

  // --- Helper Functions ---
  function showError(message, description = "") {
    window.toast(message, {
      description: description,
      type: "danger",
      position: "top-center",
    });
  }

  function showSuccess(message, description = "") {
    window.toast(message, {
      description: description,
      type: "success",
      position: "top-center",
    });
  }

  function showInfo(message, description = "") {
    window.toast(message, {
      description: description,
      type: "info",
      position: "top-center",
    });
  }

  // --- Data Loading Functions ---
  // Load available models from Firestore
  function loadAvailableModels() {
    if (!window.firebase || !window.db) {
      showError("Firebase tidak tersedia", "Pastikan Firebase telah diinisialisasi dengan benar.");
      renderStaticFallbackModels();
      return;
    }

    window.db
      .collection("models")
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          showInfo("Tidak ada model tersedia", "Tidak ditemukan data model yang tersimpan.");
          renderStaticFallbackModels();
          return;
        }

        // Clear any loading placeholders
        modelCardsContainer.innerHTML = "";
        availableModels = [];

        querySnapshot.forEach((doc) => {
          const modelData = doc.data();
          modelData.id = doc.id;
          availableModels.push(modelData);

          // Create and append the model card to the container
          modelCardsContainer.appendChild(createModelCard(modelData));
        });

        // Initialize drag and drop functionality after cards are created
        initializeDragAndDrop();
      })
      .catch((error) => {
        console.error("Error loading models:", error);
        showError("Gagal memuat model", "Terjadi kesalahan saat memuat data model dari Firebase.");
        renderStaticFallbackModels();
      });
  }

  // Render static fallback models if Firebase fails
  function renderStaticFallbackModels() {
    modelCardsContainer.innerHTML = "";

    // Sample fallback models
    const fallbackModels = [
      {
        id: "model1",
        name: "Model A",
        description: "Sample model for testing purposes",
        parameters: [
          { name: "Accuracy", score: 85 },
          { name: "Robustness", score: 72 },
          { name: "Speed", score: 90 },
        ],
      },
      {
        id: "model2",
        name: "Model B",
        description: "Another sample model",
        parameters: [
          { name: "Accuracy", score: 78 },
          { name: "Robustness", score: 88 },
          { name: "Speed", score: 75 },
        ],
      },
      {
        id: "model3",
        name: "Model C",
        description: "Third sample model",
        parameters: [
          { name: "Accuracy", score: 92 },
          { name: "Robustness", score: 79 },
          { name: "Speed", score: 82 },
        ],
      },
    ];

    availableModels = fallbackModels;

    fallbackModels.forEach((model) => {
      modelCardsContainer.appendChild(createModelCard(model));
    });

    // Initialize drag and drop functionality after cards are created
    initializeDragAndDrop();
  }

  // --- Card Creation Functions ---
  function createModelCard(modelData) {
    const card = document.createElement("div");
    card.classList.add("bg-white", "rounded-lg", "shadow-md", "p-4", "border", "border-gray-200", "hover:border-blue-400", "transition-all", "cursor-grab", "model-card");
    card.setAttribute("draggable", "true");
    card.setAttribute("data-model-id", modelData.id);

    // Create random pastel background color for the header
    const hue = Math.floor(Math.random() * 360);
    const pastelColor = `hsl(${hue}, 70%, 90%)`;

    // Generate parameter badges HTML
    let parameterBadgesHTML = "";
    if (modelData.parameters && modelData.parameters.length) {
      const paramCount = Math.min(3, modelData.parameters.length); // Show max 3 parameters
      for (let i = 0; i < paramCount; i++) {
        parameterBadgesHTML += `<span class="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full mr-1 mb-1">${modelData.parameters[i].name}</span>`;
      }

      // If there are more parameters, add a +X badge
      if (modelData.parameters.length > 3) {
        const moreCount = modelData.parameters.length - 3;
        parameterBadgesHTML += `<span class="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">+${moreCount}</span>`;
      }
    }

    // Calculate average score if available
    let avgScore = "";
    if (modelData.parameters && modelData.parameters.length) {
      const totalScore = modelData.parameters.reduce((acc, param) => acc + (param.score || 0), 0);
      const avgScoreValue = (totalScore / modelData.parameters.length).toFixed(1);
      avgScore = `<div class="absolute top-3 right-3 bg-white rounded-full h-10 w-10 flex items-center justify-center shadow-md">
        <span class="text-sm font-bold text-blue-600">${avgScoreValue}</span>
      </div>`;
    }

    card.innerHTML = `
      <div class="h-16 -mx-4 -mt-4 mb-3 bg-gradient-to-r from-${pastelColor} to-white rounded-t-lg flex items-end px-4 pb-2">
        <h3 class="font-semibold text-gray-800 truncate">${modelData.name || "Unnamed Model"}</h3>
        ${avgScore}
      </div>
      <p class="text-sm text-gray-500 mb-2 line-clamp-2 h-10">${modelData.description || "No description available"}</p>
      <div class="mt-3 flex flex-wrap">
        ${parameterBadgesHTML || '<span class="text-xs text-gray-400">No parameters defined</span>'}
      </div>
    `;

    return card;
  }

  // Create a clone of a model card for the drop container
  function createDroppedModelCard(modelData) {
    const card = createModelCard(modelData);

    // Add a remove button to dropped cards
    const removeButton = document.createElement("button");
    removeButton.classList.add("absolute", "top-2", "right-2", "bg-red-100", "hover:bg-red-200", "text-red-600", "rounded-full", "h-6", "w-6", "flex", "items-center", "justify-center", "shadow-sm", "transition-colors");
    removeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>`;

    removeButton.addEventListener("click", function (e) {
      e.stopPropagation();
      removeModelFromDropContainer(modelData.id);
    });

    card.appendChild(removeButton);
    card.setAttribute("draggable", "false"); // Dropped cards shouldn't be draggable
    card.classList.remove("cursor-grab");

    return card;
  }

  // --- Drag & Drop Functionality ---
  function initializeDragAndDrop() {
    const modelCards = document.querySelectorAll(".model-card");

    modelCards.forEach((card) => {
      card.addEventListener("dragstart", handleDragStart);
      card.addEventListener("dragend", handleDragEnd);
    });

    modelDropContainer.addEventListener("dragover", handleDragOver);
    modelDropContainer.addEventListener("dragenter", handleDragEnter);
    modelDropContainer.addEventListener("dragleave", handleDragLeave);
    modelDropContainer.addEventListener("drop", handleDrop);
  }

  function handleDragStart(e) {
    e.target.classList.add("opacity-50");
    e.dataTransfer.setData("text/plain", e.target.getAttribute("data-model-id"));
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleDragEnd(e) {
    e.target.classList.remove("opacity-50");
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDragEnter(e) {
    e.preventDefault();
    modelDropContainer.classList.add("bg-blue-50", "border-blue-300");
  }

  function handleDragLeave(e) {
    // Only remove highlight if we're leaving the container, not entering a child
    if (e.target === modelDropContainer) {
      modelDropContainer.classList.remove("bg-blue-50", "border-blue-300");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    modelDropContainer.classList.remove("bg-blue-50", "border-blue-300");

    const modelId = e.dataTransfer.getData("text/plain");
    const modelData = availableModels.find((model) => model.id === modelId);

    if (!modelData) {
      showError("Model tidak ditemukan", "Data model yang dipilih tidak tersedia.");
      return;
    }

    // Check if model is already in the drop container
    if (droppedModels.some((model) => model.id === modelId)) {
      showInfo("Model sudah dipilih", "Model ini sudah ada di workspace.");
      return;
    }

    // Add model to the dropped models array
    droppedModels.push(modelData);

    // Update UI
    updateDropContainerUI();
  }

  // --- Dropped Container Management ---
  function updateDropContainerUI() {
    // Clear current content
    droppedModelsContainer.innerHTML = "";

    // Show or hide elements based on whether we have models
    if (droppedModels.length > 0) {
      emptyDropState.classList.add("hidden");
      droppedModelsContainer.classList.remove("hidden");
      generateWorkspaceChartBtn.disabled = false;

      // Add cards for all dropped models
      droppedModels.forEach((model) => {
        droppedModelsContainer.appendChild(createDroppedModelCard(model));
      });
    } else {
      emptyDropState.classList.remove("hidden");
      droppedModelsContainer.classList.add("hidden");
      generateWorkspaceChartBtn.disabled = true;

      // Hide the chart if it was visible
      workspaceChartContainer.classList.add("hidden");
    }
  }

  function removeModelFromDropContainer(modelId) {
    // Remove model from array
    droppedModels = droppedModels.filter((model) => model.id !== modelId);

    // Update UI
    updateDropContainerUI();
  }

  // --- Chart Generation ---
  function generateChart() {
    if (droppedModels.length === 0) {
      showError("Tidak ada model", "Tambahkan model ke workspace terlebih dahulu.");
      return;
    }

    // Show the chart container
    workspaceChartContainer.classList.remove("hidden");

    // Collect all unique parameters
    const allParameters = new Set();
    droppedModels.forEach((model) => {
      if (model.parameters) {
        model.parameters.forEach((param) => allParameters.add(param.name));
      }
    });

    const parameterNames = Array.from(allParameters);

    // Format data for the chart
    const chartData = [];
    droppedModels.forEach((model) => {
      const modelDataPoint = {
        seriesname: model.name || "Unnamed Model",
      };

      // For each parameter, find the corresponding score in this model or use 0
      parameterNames.forEach((paramName) => {
        const paramData = model.parameters ? model.parameters.find((p) => p.name === paramName) : null;
        modelDataPoint[paramName] = paramData ? paramData.score : 0;
      });

      chartData.push(modelDataPoint);
    });

    // Create the radar chart
    if (fusionChartInstanceWorkspace) {
      fusionChartInstanceWorkspace.dispose();
    }

    fusionChartInstanceWorkspace = new FusionCharts({
      type: "radar",
      renderAt: "workspaceChart",
      width: "100%",
      height: "400",
      dataFormat: "json",
      dataSource: {
        chart: {
          caption: "Perbandingan Skor Model",
          theme: "fusion",
          radarfillcolor: "#ffffff",
          plottooltext: "<b>$seriesName</b><br>$label: $value",
        },
        categories: [
          {
            category: parameterNames.map((name) => ({ label: name })),
          },
        ],
        dataset: chartData,
      },
    });

    fusionChartInstanceWorkspace.render();
    showSuccess("Grafik berhasil dibuat", "Grafik perbandingan model sudah ditampilkan.");

    // Scroll to chart
    workspaceChartContainer.scrollIntoView({ behavior: "smooth" });
  }

  // --- Event Listeners ---
  // Generate chart button
  generateWorkspaceChartBtn.addEventListener("click", generateChart);

  // Reset workspace button
  resetWorkspaceBtn.addEventListener("click", function () {
    droppedModels = [];
    updateDropContainerUI();
    workspaceChartContainer.classList.add("hidden");
    showInfo("Workspace direset", "Semua model telah dihapus dari workspace.");
  });

  // --- Initialization ---
  // Load models when the page loads
  loadAvailableModels();

  // Handle notifications from main script if available
  if (window.fetchAndUpdateNotificationBadge) {
    window.fetchAndUpdateNotificationBadge();
  }
});
