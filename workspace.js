import * as Utils from "./utilitas/script.js";

// --- Variabel & Element References ---
const modelCardsContainer = document.getElementById("modelCardsContainer");
const modelDropContainer = document.getElementById("modelDropContainer");
const droppedModelsContainer = document.getElementById("droppedModelsContainer");
const emptyDropState = document.getElementById("emptyDropState");
const generateWorkspaceChartBtn = document.getElementById("generateWorkspaceChartBtn");
const resetWorkspaceBtn = document.getElementById("resetWorkspaceBtn");
const workspaceChartContainer = document.getElementById("workspaceChartContainer");
const workspaceChart = document.getElementById("workspaceChart");
const workspaceSummaryTableContainer = document.getElementById("workspaceSummaryTableContainer"); // Tambahkan ini
const workspaceSummaryTable = document.getElementById("workspaceSummaryTable"); // Tambahkan ini

let droppedModels = [];
let availableModels = [];
let fusionChartInstanceWorkspace = null;
let modelDataCache = {};

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

function showInfo(message, description = "", saveToDb = false) {
  window.toast(message, {
    description: description,
    type: "info",
    position: "top-center",
    saveToDb: saveToDb,
  });
}

// --- Data Loading Functions ---
// Load available models from Firestore
async function loadAvailableModels() {
  // Added async
  if (!db) {
    showError("Firebase tidak tersedia");
    renderStaticFallbackModels();
    return;
  }
  modelCardsContainer.innerHTML = `
            <div class="animate-pulse space-y-2">
              <div class="h-32 bg-gray-200 rounded-md"></div>
              <div class="h-4 bg-gray-200 rounded w-3/4"></div>
              <div class="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div class="animate-pulse space-y-2">
              <div class="h-32 bg-gray-200 rounded-md"></div>
              <div class="h-4 bg-gray-200 rounded w-3/4"></div>
              <div class="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
    `;
  modelDataCache = {};
  availableModels = []; // Initialize availableModels

  try {
    const querySnapshot = await db.collection("benchmarkData").limit(20).get();
    if (querySnapshot.empty) {
      showInfo("Tidak ada model tersedia", "Tidak ditemukan data model yang tersimpan.");
      renderStaticFallbackModels();
      return;
    }

    modelCardsContainer.innerHTML = ""; // Clear loading skeletons

    querySnapshot.forEach((doc) => {
      const docData = doc.data();
      if (docData.models && Array.isArray(docData.models)) {
        docData.models.forEach((model, index) => {
          const modelId = `${doc.id}-${index}`; // Create a unique ID for each model
          const parameters = [];
          if (model.scores) {
            for (const key in model.scores) {
              if (Object.hasOwnProperty.call(model.scores, key)) {
                parameters.push({ name: key, score: model.scores[key] });
              }
            }
          }

          // Generate pastel color ONCE and store it
          const hue = Math.floor(Math.random() * 360);
          const pastelColor = `hsl(${hue}, 70%, 90%)`;
          const generatedPastelColorHex = Utils.convertHslStringToHexString(pastelColor);

          const processedModel = {
            id: modelId,
            name: model.name || "Unnamed Model",
            description: model.description,
            parameters: [],
            pastelColorHex: generatedPastelColorHex,
            originalDocId: doc.id,
            originalModelIndex: index,
          };

          modelDataCache[modelId] = processedModel;
          availableModels.push(processedModel);
          modelCardsContainer.appendChild(createModelCard(processedModel));
        });
      }
    });

    if (availableModels.length === 0) {
      showInfo("Tidak ada model yang valid ditemukan", "Data model dalam format yang tidak sesuai atau kosong.");
      renderStaticFallbackModels(); // Fallback if no valid models processed
    } else {
      initializeDragAndDrop(); // Initialize drag and drop after cards are created
    }
  } catch (error) {
    console.error("Error loading models:", error);
    showError("Gagal memuat model", "Terjadi kesalahan saat memuat data model dari Firebase.");
  }
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

  // Use stored color if available, otherwise generate (for safety/fallback)
  let headerColorHex = modelData.pastelColorHex;
  if (!headerColorHex) {
    const hue = Math.floor(Math.random() * 360);
    const pastelColor = `hsl(${hue}, 70%, 90%)`;
    headerColorHex = Utils.convertHslStringToHexString(pastelColor);
    // Optionally, if modelData is part of availableModels and mutable, you could store it back:
    // if (availableModels.find(m => m.id === modelData.id)) modelData.pastelColorHex = headerColorHex;
  }

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
      <div class="h-16 -mx-4 -mt-4 mb-3 bg-gradient-to-r from-[${headerColorHex}] to-white rounded-t-lg flex items-end px-4 pb-2">
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
    resetWorkspaceBtn.disabled = false;

    // Add cards for all dropped models
    droppedModels.forEach((model) => {
      droppedModelsContainer.appendChild(createDroppedModelCard(model));
    });
  } else {
    emptyDropState.classList.remove("hidden");
    droppedModelsContainer.classList.add("hidden");
    generateWorkspaceChartBtn.disabled = true;
    resetWorkspaceBtn.disabled = true;

    // Hide the chart if it was visible
    workspaceChartContainer.classList.add("hidden");
    workspaceSummaryTableContainer.classList.add("hidden"); // Sembunyikan tabel juga
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
  workspaceSummaryTableContainer.classList.remove("hidden"); // Tampilkan kontainer tabel

  // Collect all unique parameters (categories for the chart)
  const allParameters = new Set();
  droppedModels.forEach((model) => {
    if (model.parameters && model.parameters.length > 0) {
      model.parameters.forEach((param) => allParameters.add(param.name));
    }
  });

  const categories = Array.from(allParameters).map((name) => ({ label: name }));

  // Format data for the chart (datasets)
  const datasets = [];
  droppedModels.forEach((model) => {
    const dataset = {
      seriesname: model.name || "Unnamed Model",
      data: [],
    };
    categories.forEach((category) => {
      const param = model.parameters.find((p) => p.name === category.label);
      dataset.data.push({ value: param ? param.score : null }); // Use null for missing scores
    });
    datasets.push(dataset);
  });

  // Create the multi-series bar chart (msbar2d)
  if (fusionChartInstanceWorkspace) {
    fusionChartInstanceWorkspace.dispose(); // Dispose of the old chart if it exists
  }

  fusionChartInstanceWorkspace = new FusionCharts({
    type: "msbar2d", // Changed from radar to msbar2d
    renderAt: "workspaceChart",
    width: "100%",
    height: "450",
    dataFormat: "json",
    dataSource: {
      chart: {
        caption: "Perbandingan Skor Model di Workspace",
        subCaption: "Berdasarkan Parameter yang Dipilih",
        xAxisName: "Model", // X-axis will show model names if not using categories this way
        yAxisName: "Skor",
        theme: "fusion",
        showValues: "1",
        valueFontColor: "#666666",
        valueBgColor: "#FFFFFF",
        valueBgAlpha: "70",
        valueBorderPadding: "2",
        valueBorderRadius: "2",
        rotateValues: "0", // Keep values horizontal for bar chart
        placeValuesInside: "0", // Place values outside bars
        legendPosition: "bottom",
        drawCrossLine: "1",
      },
      categories: [
        {
          category: categories, // Categories are the parameters
        },
      ],
      dataset: datasets,
    },
  });
  fusionChartInstanceWorkspace.render();
  showSuccess("Grafik berhasil dibuat!", "Grafik perbandingan model telah ditampilkan.");

  // Generate summary table for workspace
  generateWorkspaceSummaryTable({
    parameterNames: categories.map((c) => c.label),
    models: droppedModels.map((model) => ({
      name: model.name,
      scores: model.parameters.map((param) => ({
        parameter: param.name,
        value: param.score,
      })),
    })),
  }); // Panggil fungsi untuk membuat tabel
}

// --- Tambahkan fungsi untuk membuat tabel kesimpulan di workspace ---
function generateWorkspaceSummaryTable(chartData) {
  if (!workspaceSummaryTable) {
    console.error("Elemen #workspaceSummaryTable tidak ditemukan.");
    return;
  }
  workspaceSummaryTable.innerHTML = ""; // Kosongkan tabel sebelumnya

  if (!chartData || !chartData.parameterNames || chartData.parameterNames.length === 0 || !chartData.models || chartData.models.length === 0) {
    workspaceSummaryTable.innerHTML = '<p class="text-center text-gray-500 italic p-4">Data tidak cukup untuk membuat kesimpulan.</p>';
    return;
  }

  let tableHtml = `
    <h3 class="text-base md:text-lg font-semibold mb-3 text-gray-700 text-center mt-4">Kesimpulan Model Unggulan per Kategori (Workspace)</h3>
    <div class="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th scope="col" class="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">🌟 Kategori Terbaik</th>
                    <th scope="col" class="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">🏆 Model Unggulan</th>
                    <th scope="col" class="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">🏅 Peringkat Model</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

  chartData.parameterNames.forEach((paramName) => {
    let modelsWithScores = chartData.models
      .map((model) => {
        const scoreObj = model.scores.find((s) => s.parameter === paramName);
        const score = scoreObj ? parseFloat(scoreObj.value) : -1;
        return {
          name: model.name,
          score: isNaN(score) ? -1 : score,
        };
      })
      .filter((model) => model.score !== -1)
      .sort((a, b) => b.score - a.score);

    let winners = [];
    let maxScore = -1;
    if (modelsWithScores.length > 0) {
      maxScore = modelsWithScores[0].score;
      winners = modelsWithScores.filter((model) => model.score === maxScore).map((m) => m.name);
    }

    let rankingHtml = "";
    if (modelsWithScores.length > 0) {
      const topModels = modelsWithScores.slice(0, 3);
      const medals = ["🥇", "🥈", "🥉"];
      rankingHtml = topModels
        .map((model, index) => {
          return `${medals[index] || ""} ${model.name} (${model.score.toFixed(2)}%)`;
        })
        .join("<br>");
    } else {
      rankingHtml = '<span class="italic text-gray-400">N/A</span>';
    }

    tableHtml += `
        <tr class="hover:bg-gray-50 transition-colors duration-150">
            <td class="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">${paramName}</td>
            <td class="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">
                ${maxScore === -1 ? '<span class="italic text-gray-400">N/A</span>' : winners.join(" / ")}
                ${maxScore !== -1 ? ` <span class="text-xs text-gray-400">(${maxScore.toFixed(2)}%)</span>` : ""}
            </td>
            <td class="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">${rankingHtml}</td>
        </tr>
    `;
  });

  tableHtml += `
            </tbody>
        </table>
    </div>
  `;
  workspaceSummaryTable.innerHTML = tableHtml;
}

// --- Event Listeners ---
// Generate chart button
generateWorkspaceChartBtn.addEventListener("click", generateChart);

// Reset workspace button
resetWorkspaceBtn.addEventListener("click", function () {
  droppedModels = [];
  updateDropContainerUI();
  workspaceChartContainer.classList.add("hidden");
  workspaceSummaryTableContainer.classList.add("hidden"); // Sembunyikan tabel juga
  showInfo("Workspace direset", "Semua model telah dihapus dari workspace.");
});

document.addEventListener("DOMContentLoaded", function () {
  generateWorkspaceChartBtn.disabled = true;
  resetWorkspaceBtn.disabled = true;
  // --- Initialization ---
  // Load models when the page loads
  loadAvailableModels();
  // Handle notifications from main script if available
  if (window.fetchAndUpdateNotificationBadge) {
    window.fetchAndUpdateNotificationBadge();
  }
});
