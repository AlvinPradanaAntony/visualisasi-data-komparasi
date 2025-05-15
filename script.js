// --- Fungsi Global untuk Toast (Sudah didefinisikan di dalam x-init di body) ---

// --- Variabel Global Lainnya ---
const parameterContainer = document.getElementById("parameterContainer");
const modelContainer = document.getElementById("modelContainer");
const addParameterBtn = document.getElementById("addParameterBtn");
const addModelBtn = document.getElementById("addModelBtn");
const generateChartBtn = document.getElementById("generateChartBtn"); // Tombol utama
const viewHistoryBtn = document.getElementById("viewHistoryBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const resetChartBtn = document.getElementById("resetChartBtn");
const editModeInfo = document.getElementById("editModeInfo");
const chartContainerDiv = document.getElementById("chartContainer");
const summaryTableContainer = document.getElementById("summaryTableContainer");
const historyModal = document.getElementById("historyModal");
const closeHistoryModalBtn = document.getElementById("closeHistoryModalBtn");
const historyListDiv = document.getElementById("historyList");
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const deleteConfirmMessage = document.getElementById("deleteConfirmMessage");
const cancelDeleteBtnModal = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const closeDeleteConfirmModalBtn = document.getElementById("closeDeleteConfirmModalBtn");

// Variabel untuk Notifikasi
const viewNotificationBtn = document.getElementById("viewNotificationBtn");
const notificationModal = document.getElementById("notificationModal");
const closeNotificationModalBtn = document.getElementById("closeNotificationModalBtn");
const notificationListDiv = document.getElementById("notificationList");
const clearAllNotificationsBtn = document.getElementById("clearAllNotificationsBtn");
const deleteNotificationConfirmModal = document.getElementById("deleteNotificationConfirmModal");
const deleteNotificationConfirmMessage = document.getElementById("deleteNotificationConfirmMessage");
const cancelDeleteNotificationBtn = document.getElementById("cancelDeleteNotificationBtn");
const confirmDeleteNotificationBtn = document.getElementById("confirmDeleteNotificationBtn");
const clearAllNotificationsConfirmModal = document.getElementById("clearAllNotificationsConfirmModal");
const cancelClearAllNotificationsBtn = document.getElementById("cancelClearAllNotificationsBtn");
const confirmClearAllNotificationsBtn = document.getElementById("confirmClearAllNotificationsBtn");
const notificationsCollection = "notifications"; // Nama koleksi Firestore
let notificationDocIdToDelete = null;
let notificationElementToDelete = null;
const notificationBadge = document.getElementById("notificationBadge");

let fusionChartInstance = null;
let draggedItem = null;
let dropTargetIndicator = null;
let db = null;
let historicalDataCache = {};
let docIdToDelete = null;
let isEditMode = false;
let editingDocId = null;

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA4veyYHQo-IUAJyctRvpsp-eAKoSlbnJ4",
  authDomain: "comparison-llm-scores.firebaseapp.com",
  projectId: "comparison-llm-scores",
  storageBucket: "comparison-llm-scores.appspot.com",
  messagingSenderId: "1076662003447",
  appId: "1:1076662003447:web:0e1a8766ddf3e6301755f2",
  measurementId: "G-KGKG21BFWH",
};
// --- AKHIR KONFIGURASI FIREBASE ---

// Inisialisasi Firebase
function initializeFirebase() {
  try {
    const isConfigPlaceholder = !firebaseConfig.projectId || !firebaseConfig.apiKey || firebaseConfig.projectId.startsWith("GANTI_") || firebaseConfig.apiKey.startsWith("GANTI_");
    if (isConfigPlaceholder) {
      window.toast("Konfigurasi Firebase Dibutuhkan!", { description: "Masukkan konfigurasi Firebase Anda di kode JavaScript untuk mengaktifkan penyimpanan dan histori.", type: "warning", position: "top-center" });
      throw new Error("Konfigurasi Firebase belum lengkap.");
    } else {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      console.log("Firebase berhasil diinisialisasi.");
      // Aktifkan tombol utama & histori & notifikasi
      generateChartBtn.disabled = false;
      generateChartBtn.title = "";
      generateChartBtn.classList.remove("opacity-50", "cursor-not-allowed");
      viewHistoryBtn.disabled = false;
      viewHistoryBtn.title = "";
      viewHistoryBtn.classList.remove("opacity-50", "cursor-not-allowed");
      resetChartBtn.disabled = false;
      resetChartBtn.classList.remove("hidden");
      if (viewNotificationBtn) {
        // Cek jika tombol notifikasi ada
        viewNotificationBtn.disabled = false;
        viewNotificationBtn.title = "Lihat Notifikasi";
        viewNotificationBtn.classList.remove("opacity-50", "cursor-not-allowed");
        fetchAndUpdateNotificationBadge(); // Muat badge awal
      }
    }
  } catch (error) {
    console.error("Gagal menginisialisasi Firebase:", error);
    window.toast("Error Inisialisasi Firebase!", { description: `Gagal menginisialisasi Firebase: ${error.message}. Penyimpanan & Histori tidak akan berfungsi.`, type: "danger", position: "top-center" });
    // Nonaktifkan tombol utama & histori & notifikasi
    generateChartBtn.disabled = true;
    generateChartBtn.title = "Inisialisasi Firebase gagal.";
    generateChartBtn.classList.add("opacity-50", "cursor-not-allowed");
    viewHistoryBtn.disabled = true;
    viewHistoryBtn.title = "Inisialisasi Firebase gagal.";
    viewHistoryBtn.classList.add("opacity-50", "cursor-not-allowed");
    // Sembunyikan tombol reset jika init gagal
    resetChartBtn.classList.add("hidden");
    if (viewNotificationBtn) {
      viewNotificationBtn.disabled = true;
      viewNotificationBtn.title = "Inisialisasi Firebase gagal.";
      viewNotificationBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
  }
}
// Panggil init setelah Alpine siap (event listener di bawah)

// --- Fungsi Utilitas ---
function generateUniqueId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}
function formatFirestoreTimestamp(timestamp) {
  if (!timestamp) return "Timestamp tidak ada"; // Handle null/undefined timestamp
  if (timestamp && typeof timestamp.toDate === "function") {
    try {
      const date = timestamp.toDate();
      const options = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }; // Tambah detik
      return date.toLocaleDateString("id-ID", options);
    } catch (error) {
      console.error("Error formatting timestamp:", error, "Input:", timestamp);
      return "Error Format Timestamp";
    }
  }
  // Jika bukan objek Timestamp Firestore, coba format sebagai Date biasa
  if (timestamp instanceof Date) {
    try {
      const options = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" };
      return timestamp.toLocaleDateString("id-ID", options);
    } catch (e) {
      console.error("Error formatting Date object:", e, "Input:", timestamp);
      return "Error Format Tanggal";
    }
  }
  console.warn("formatFirestoreTimestamp received invalid input type:", timestamp);
  return "Timestamp tidak valid";
}

// --- Fungsi Pengelolaan Input ---
function clearFormInputs() {
  const paramGroups = parameterContainer.querySelectorAll(".parameter-input-group");
  paramGroups.forEach((group, index) => {
    if (index > 0) group.remove();
    else {
      group.dataset.paramId = generateUniqueId("param");
      const input = group.querySelector(".parameter-name");
      if (input) input.value = "";
    }
  });
  if (parameterContainer.children.length === 0) addParameterInput();
  const modelGroups = modelContainer.querySelectorAll(".model-input-group");
  modelGroups.forEach((group, index) => {
    if (index > 0) {
      group.remove();
    } else {
      group.dataset.modelId = generateUniqueId("model");
      const input = group.querySelector(".model-name");
      if (input) input.value = "";
      const scoresContainer = group.querySelector(".scores-container");
      if (scoresContainer) {
        scoresContainer.innerHTML = "";
        scoresContainer.classList.add("hidden"); // Pastikan tersembunyi saat reset
        const toggleBtn = group.querySelector(".toggle-scores-btn");
        if (toggleBtn) toggleBtn.innerHTML = "Input Skor Parameter &#9662;"; // Reset teks tombol
      }
    }
  });
  if (modelContainer.children.length === 0) addModelInput();
  updateModelInputs(); // Ini akan memanggil updateModelInputsForGroup
  updateRemoveButtons("#parameterContainer", ".parameter-input-group");
  updateRemoveButtons("#modelContainer", ".model-input-group");
  // Kosongkan juga tabel kesimpulan
  if (summaryTableContainer) {
    summaryTableContainer.innerHTML = '<div id="summaryTable"></div>'; // Reset ke placeholder
  }
}
function removeInputGroup(button, containerSelector, groupSelector, callback = null) {
  const container = document.querySelector(containerSelector);
  if (container.querySelectorAll(groupSelector).length > 1) {
    const groupToRemove = button.closest(groupSelector);
    if (groupToRemove) {
      groupToRemove.remove();
      if (callback) {
        setTimeout(callback, 0);
      }
      updateRemoveButtons(containerSelector, groupSelector);
    }
  } else {
    window.toast("Input Error", { description: `Minimal harus ada satu ${groupSelector.includes("parameter") ? "parameter" : "model"}.`, type: "danger", position: "top-right" });
  }
}
function updateRemoveButtons(containerSelector, groupSelector) {
  const container = document.querySelector(containerSelector);
  const groups = container.querySelectorAll(groupSelector);
  const disableRemove = groups.length <= 1;
  groups.forEach((group) => {
    const removeButton = group.querySelector(groupSelector.includes("parameter") ? ".remove-parameter-btn" : ".remove-model-btn");
    if (removeButton) {
      removeButton.disabled = disableRemove;
      removeButton.classList.toggle("opacity-50", disableRemove);
      removeButton.classList.toggle("cursor-not-allowed", disableRemove);
    }
  });
}
function addParameterInput(initialValue = "", existingParamId = null) {
  const paramId = existingParamId || generateUniqueId("param");
  const suggestionsId = `suggestions_${paramId}`;
  const newInputGroup = document.createElement("div");
  newInputGroup.className = "parameter-input-group";
  newInputGroup.setAttribute("draggable", "true");
  newInputGroup.dataset.paramId = paramId;
  newInputGroup.innerHTML = `
                <span class="drag-handle">☰</span>
                <div class="parameter-input-wrapper">
                    <input type="text" 
                           name="parameterName_${paramId}" 
                           placeholder="Nama Parameter" 
                           class="parameter-name p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                           required 
                           oninput="handleParameterNameInput(this); filterParameterSuggestions(this);" 
                           value="${initialValue}" 
                           onfocus="showParameterSuggestions(this);" 
                           onblur="hideParameterSuggestionsWithDelay(this);"
                           autocomplete="off">
                    <div class="parameter-suggestions-container" id="${suggestionsId}">
                        <!-- Suggestions will be populated here -->
                    </div>
                </div>
                <button type="button" class="remove-btn remove-parameter-btn" onclick="removeInputGroup(this, '#parameterContainer', '.parameter-input-group', updateModelInputs)" title="Hapus Parameter">X</button>
            `;
  parameterContainer.appendChild(newInputGroup);
  addDragDropListeners(newInputGroup);
  updateRemoveButtons("#parameterContainer", ".parameter-input-group");
  updateModelInputs();
  return newInputGroup;
}
// Modifikasi addModelInput untuk collapsible
function addModelInput(initialValue = "", existingModelId = null) {
  const modelId = existingModelId || generateUniqueId("model");
  const newInputGroup = document.createElement("div");
  newInputGroup.className = "model-input-group";
  newInputGroup.dataset.modelId = modelId;
  newInputGroup.setAttribute("draggable", "true"); // Tambahkan draggable attribute
  newInputGroup.innerHTML = `
                <div class="model-name-row">
                    <span class="drag-handle">☰</span>
                    <input type="text" name="modelName[]" placeholder="Nama Model" class="model-name p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required value="${initialValue}">
                    <button type="button" class="remove-btn remove-model-btn" onclick="removeInputGroup(this, '#modelContainer', '.model-input-group')" title="Hapus Model">X</button>
                </div>
                <button type="button" class="toggle-scores-btn w-full text-left text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none mt-2" onclick="toggleScoresVisibility('${modelId}')">
                    Input Skor Parameter &#9662; </button>
                <div id="scores_${modelId}" class="scores-container hidden"></div>`; // Tambahkan ID dan kelas hidden
  modelContainer.appendChild(newInputGroup);
  updateModelInputsForGroup(newInputGroup, null);
  updateRemoveButtons("#modelContainer", ".model-input-group");
  addDragDropListenersForModel(newInputGroup); // Tambahkan listeners untuk drag & drop
  return newInputGroup;
}

// Fungsi untuk toggle visibilitas skor
function toggleScoresVisibility(modelId) {
  const scoresContainer = document.getElementById(`scores_${modelId}`);
  const toggleBtn = event ? event.currentTarget : document.querySelector(`[onclick*="toggleScoresVisibility('${modelId}')"]`);
  if (scoresContainer && toggleBtn) {
    const isHidden = scoresContainer.classList.toggle("hidden");
    // Ubah teks tombol dan panah
    if (isHidden) {
      toggleBtn.innerHTML = "Input Skor Parameter &#9662;"; // Panah bawah
    } else {
      toggleBtn.innerHTML = "Sembunyikan Skor &#9652;"; // Panah atas
    }
  } else {
    console.error(`Could not find scores container or toggle button for model ID: ${modelId}`);
  }
}

// Update semua input skor di semua model
function updateModelInputs() {
  const modelGroups = modelContainer.querySelectorAll(".model-input-group");
  const paramIdToNameMap = {};
  parameterContainer.querySelectorAll(".parameter-input-group").forEach((pg) => {
    const id = pg.dataset.paramId;
    const input = pg.querySelector(".parameter-name");
    if (id && input) {
      paramIdToNameMap[id] = input.value.trim() || "Parameter";
    }
  });
  modelGroups.forEach((modelGroup) => updateModelInputsForGroup(modelGroup, null, paramIdToNameMap));
  updateRemoveButtons("#parameterContainer", ".parameter-input-group");
}

// Update input skor untuk satu grup model
function updateModelInputsForGroup(modelGroup, scoresData = null, paramIdToNameMap = null) {
  const scoresContainer = modelGroup.querySelector(".scores-container");
  if (!scoresContainer) return;
  const modelId = modelGroup.dataset.modelId;

  // Terapkan kelas grid responsif dinamis
  const parameterCount = parameterContainer.querySelectorAll(".parameter-input-group").length;
  let gridClasses = "grid gap-3 "; // Base grid classes
  if (parameterCount > 1) {
    gridClasses += "grid-cols-2 md:gap-4"; // 2 kolom di md+ jika > 1 param
  } else {
    gridClasses += "grid-cols-1"; // 1 kolom jika 1 param
  }
  const wasHidden = scoresContainer.classList.contains("hidden"); // Simpan status hidden
  scoresContainer.className = `scores-container ${gridClasses}`; // Terapkan kelas grid
  if (wasHidden) {
    scoresContainer.classList.add("hidden"); // Pastikan tetap hidden jika sebelumnya hidden
  }

  if (!paramIdToNameMap) {
    paramIdToNameMap = {};
    parameterContainer.querySelectorAll(".parameter-input-group").forEach((pg) => {
      const id = pg.dataset.paramId;
      const input = pg.querySelector(".parameter-name");
      if (id && input) {
        paramIdToNameMap[id] = input.value.trim() || "Parameter";
      }
    });
  }

  const existingScores = {};
  scoresContainer.querySelectorAll(".score-value").forEach((input) => {
    const paramId = input.dataset.paramId;
    if (paramId) {
      existingScores[paramId] = input.value;
    }
  });

  scoresContainer.innerHTML = ""; // Kosongkan
  const parameterGroups = parameterContainer.querySelectorAll(".parameter-input-group");
  parameterGroups.forEach((paramGroup) => {
    const paramId = paramGroup.dataset.paramId;
    if (!paramId) return;

    const paramName = paramIdToNameMap[paramId] || "Parameter";
    const scoreInputDiv = document.createElement("div");
    scoreInputDiv.className = "score-input-group"; // Kelas ini tetap
    const inputId = `score_${modelId}_${paramId}`;
    scoreInputDiv.innerHTML = `
                    <label for="${inputId}" class="block text-center" title="${paramName}">${paramName}</label>
                    <input type="number" step="any" id="${inputId}" name="score_${paramId}[]" data-param-id="${paramId}" placeholder="Skor" min="0" max="100" class="score-value p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>`;

    const scoreInput = scoreInputDiv.querySelector("input");
    if (scoresData && scoresData[paramName] !== undefined) {
      scoreInput.value = scoresData[paramName];
    } else if (existingScores[paramId] !== undefined) {
      scoreInput.value = existingScores[paramId];
    }
    scoresContainer.appendChild(scoreInputDiv);
  });
}
// Update label skor saat nama parameter diubah
function handleParameterNameInput(parameterInput) {
  const parameterGroup = parameterInput.closest(".parameter-input-group");
  if (!parameterGroup) return;
  const paramId = parameterGroup.dataset.paramId;
  const newName = parameterInput.value.trim() || "Parameter";
  if (!paramId) {
    console.error("Parameter ID tidak ditemukan untuk input:", parameterInput);
    return;
  }

  const modelGroups = modelContainer.querySelectorAll(".model-input-group");
  modelGroups.forEach((modelGroup) => {
    const scoreInput = modelGroup.querySelector(`.score-value[data-param-id="${paramId}"]`);
    if (scoreInput) {
      const scoreLabel = modelGroup.querySelector(`label[for="${scoreInput.id}"]`);
      if (scoreLabel) {
        scoreLabel.textContent = newName;
        scoreLabel.title = newName;
      }
    }
  });
}

// --- Fungsi Drag and Drop ---
function addDragDropListeners(element) {
  element.addEventListener("dragstart", handleDragStart);
  element.addEventListener("dragover", handleDragOver);
  element.addEventListener("dragenter", handleDragEnter);
  element.addEventListener("dragleave", handleDragLeave);
  element.addEventListener("drop", handleDrop);
  element.addEventListener("dragend", handleDragEnd);
}
function addDragDropListenersForModel(element) {
  element.addEventListener("dragstart", handleModelDragStart);
  element.addEventListener("dragover", handleModelDragOver);
  element.addEventListener("dragenter", handleModelDragEnter);
  element.addEventListener("dragleave", handleModelDragLeave);
  element.addEventListener("drop", handleModelDrop);
  element.addEventListener("dragend", handleModelDragEnd);
}

function handleDragStart(e) {
  draggedItem = this;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", this.dataset.paramId || this.dataset.modelId);
  setTimeout(() => {
    if (draggedItem) draggedItem.classList.add("dragging");
  }, 0);
}
function handleDragOver(e) {
  e.preventDefault();
  if (!draggedItem || this === draggedItem) return;
  const targetRect = this.getBoundingClientRect();
  const dropY = e.clientY;
  const isAfter = dropY > targetRect.top + targetRect.height / 2;
  clearDropIndicator();
  this.classList.add("drag-over-target");
  this.classList.toggle("drop-after", isAfter);
  dropTargetIndicator = this;
}
function handleDragEnter(e) {
  e.preventDefault();
}
function handleDragLeave(e) {
  if (!this.contains(e.relatedTarget) && dropTargetIndicator === this) {
    clearDropIndicator();
  }
}
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  if (!draggedItem || draggedItem === this) {
    clearDropIndicator();
    return;
  }
  const targetRect = this.getBoundingClientRect();
  const dropY = e.clientY;
  const isAfter = dropY > targetRect.top + targetRect.height / 2;
  if (isAfter) {
    this.parentNode.insertBefore(draggedItem, this.nextSibling);
  } else {
    this.parentNode.insertBefore(draggedItem, this);
  }
  clearDropIndicator();
  setTimeout(updateModelInputs, 0);
}
function handleDragEnd(e) {
  if (draggedItem) {
    draggedItem.classList.remove("dragging");
  }
  clearDropIndicator();
  draggedItem = null;
}
function clearDropIndicator() {
  const indicators = parameterContainer.querySelectorAll(".drag-over-target");
  indicators.forEach((el) => {
    el.classList.remove("drag-over-target", "drop-after");
  });
  dropTargetIndicator = null;
}

// --- Fungsi Drag and Drop untuk Model ---
function handleModelDragStart(e) {
  draggedItem = this;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", this.dataset.modelId);
  setTimeout(() => {
    if (draggedItem) draggedItem.classList.add("dragging");
  }, 0);
}

function handleModelDragOver(e) {
  e.preventDefault();
  if (!draggedItem || this === draggedItem) return;
  const targetRect = this.getBoundingClientRect();
  const dropY = e.clientY;
  const isAfter = dropY > targetRect.top + targetRect.height / 2;
  clearModelDropIndicator();
  this.classList.add("drag-over-target");
  this.classList.toggle("drop-after", isAfter);
  dropTargetIndicator = this;
}

function handleModelDragEnter(e) {
  e.preventDefault();
}

function handleModelDragLeave(e) {
  if (!this.contains(e.relatedTarget) && dropTargetIndicator === this) {
    clearModelDropIndicator();
  }
}

function handleModelDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  if (!draggedItem || draggedItem === this) {
    clearModelDropIndicator();
    return;
  }
  const targetRect = this.getBoundingClientRect();
  const dropY = e.clientY;
  const isAfter = dropY > targetRect.top + targetRect.height / 2;
  if (isAfter) {
    this.parentNode.insertBefore(draggedItem, this.nextSibling);
  } else {
    this.parentNode.insertBefore(draggedItem, this);
  }
  clearModelDropIndicator();
  // Pode adicionar outras atualizações após a reorganização, se necessário
}

function handleModelDragEnd(e) {
  if (draggedItem) {
    draggedItem.classList.remove("dragging");
  }
  clearModelDropIndicator();
  draggedItem = null;
}

function clearModelDropIndicator() {
  const indicators = modelContainer.querySelectorAll(".drag-over-target");
  indicators.forEach((el) => {
    el.classList.remove("drag-over-target", "drop-after");
  });
  dropTargetIndicator = null;
}

parameterContainer.querySelectorAll(".parameter-input-group").forEach(addDragDropListeners); // Tambahkan listener ke elemen awal
modelContainer.querySelectorAll(".model-input-group").forEach(addDragDropListenersForModel); // Tambahkan listener ke elemen awal

// --- Fungsi Pengelolaan Grafik & Penyimpanan ---

// Mempersiapkan data dari form untuk grafik dan Firestore
function prepareChartData() {
  let isValid = true;
  const data = {
    parameterNames: [], // Array nama parameter (sesuai urutan DOM)
    parameterIds: [], // Array ID parameter (untuk referensi internal) -> DIPERLUKAN UNTUK GRAFIK
    models: [], // Array objek model
    entryName: null, // Field untuk nama histori
  };

  // 1. Kumpulkan Parameter (Nama dan ID)
  const parameterGroups = parameterContainer.querySelectorAll(".parameter-input-group");
  if (parameterGroups.length === 0) {
    window.toast("Input Error", { description: "Harap tambahkan setidaknya satu parameter.", type: "danger", position: "top-right" });
    return null;
  }

  const parameterNameSet = new Set(); // Cek duplikasi nama parameter
  parameterGroups.forEach((group, index) => {
    const input = group.querySelector(".parameter-name");
    const paramId = group.dataset.paramId;
    const name = input ? input.value.trim() : "";

    if (input) input.classList.remove("border-red-500"); // Reset border error

    if (!name) {
      // Validasi nama tidak kosong
      window.toast("Input Error", { description: `Nama parameter ke-${index + 1} tidak boleh kosong.`, type: "danger", position: "top-right" });
      if (input) input.classList.add("border-red-500");
      isValid = false;
    } else if (parameterNameSet.has(name)) {
      // Validasi nama unik
      window.toast("Input Error", { description: `Nama parameter "${name}" duplikat. Nama parameter harus unik.`, type: "danger", position: "top-right" });
      if (input) input.classList.add("border-red-500");
      isValid = false;
    } else {
      parameterNameSet.add(name);
    }

    if (!paramId) {
      // Validasi ID ada
      console.error(`Parameter group ke-${index + 1} tidak memiliki data-param-id.`);
      window.toast("Kesalahan Internal", { description: `ID parameter hilang.`, type: "danger", position: "top-right" });
      isValid = false;
    }
    data.parameterNames.push(name);
    data.parameterIds.push(paramId); // Simpan ID untuk referensi grafik
  });
  if (!isValid) return null;

  // 2. Kumpulkan Model dan Skornya
  const modelGroups = modelContainer.querySelectorAll(".model-input-group");
  if (modelGroups.length === 0) {
    window.toast("Input Error", { description: "Harap tambahkan setidaknya satu model.", type: "danger", position: "top-right" });
    return null;
  }

  modelGroups.forEach((group, modelIndex) => {
    const modelNameInput = group.querySelector(".model-name");
    const modelName = modelNameInput ? modelNameInput.value.trim() : "";
    const scores = {}; // Objek skor { namaParameter: skor }

    if (modelNameInput) modelNameInput.classList.remove("border-red-500"); // Reset border error
    if (!modelName) {
      // Validasi nama model
      window.toast("Input Error", { description: `Nama model ke-${modelIndex + 1} tidak boleh kosong.`, type: "danger", position: "top-right" });
      if (modelNameInput) modelNameInput.classList.add("border-red-500");
      isValid = false;
    }

    // Iterasi berdasarkan parameter yang sudah dikumpulkan
    data.parameterIds.forEach((paramId, paramIndex) => {
      const paramName = data.parameterNames[paramIndex]; // Ambil nama parameter
      const scoreInput = group.querySelector(`input.score-value[data-param-id="${paramId}"]`); // Cari input skor berdasarkan ID

      if (!scoreInput) {
        console.error(`Input skor untuk paramId ${paramId} tidak ditemukan di model ${modelName}`);
        window.toast("Kesalahan Internal", { description: `Input skor hilang untuk model ${modelName}.`, type: "danger", position: "top-right" });
        isValid = false;
        return;
      }

      const scoreValue = scoreInput.value;
      const score = parseFloat(scoreValue);
      scoreInput.classList.remove("border-red-500"); // Reset border error

      if (scoreValue === "" || isNaN(score) || score < 0 || score > 100) {
        // Validasi skor
        window.toast("Input Error", { description: `Skor untuk "${modelName}" pada parameter "${paramName}" harus angka antara 0 dan 100.`, type: "danger", position: "top-right" });
        scoreInput.classList.add("border-red-500");
        isValid = false;
      }
      // Gunakan nama parameter sebagai kunci
      scores[paramName] = score;
    });

    if (isValid) {
      // Tambahkan model jika valid
      data.models.push({ name: modelName, scores: scores });
    }
  });

  if (!isValid) return null;

  // Tambahkan timestamp dan nama default jika bukan mode edit
  if (!isEditMode) {
    // Timestamp
    if (firebase && firebase.firestore && firebase.firestore.FieldValue) {
      data.timestamp = firebase.firestore.FieldValue.serverTimestamp();
    } else {
      console.error("Firebase Firestore atau FieldValue tidak tersedia untuk membuat server timestamp.");
      data.timestamp = new Date(); // Fallback
    }
    // Nama histori default
    const firstModelName = data.models.length > 0 ? data.models[0].name : "Data";
    const date = new Date();
    const defaultEntryName = `${firstModelName} - ${date.toLocaleDateString("id-ID")} ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    data.entryName = defaultEntryName;
  } else if (editingDocId && historicalDataCache[editingDocId]) {
    // Jika mode edit, pertahankan nama histori dan timestamp yang ada dari cache
    data.entryName = historicalDataCache[editingDocId].entryName;
    data.timestamp = historicalDataCache[editingDocId].timestamp;
  }

  // Jangan hapus parameterIds di sini, masih dibutuhkan oleh generateChartFromData
  console.log("Data siap untuk grafik:", JSON.stringify(data, null, 2));
  return data;
}

// Menyimpan data baru ke Firestore
async function saveDataToFirestore(dataToSave) {
  // dataToSave masih memiliki parameterIds
  if (!db) {
    window.toast("Firestore Error", { description: "Firestore tidak terinisialisasi. Tidak dapat menyimpan data.", type: "danger", position: "top-center" });
    return;
  }
  window.toast("Menyimpan...", { description: "Menyimpan data ke Firebase...", type: "info", position: "top-center" });

  // Gunakan shallow copy untuk data storage dan hapus ID internal
  const dataForStorage = { ...dataToSave };
  delete dataForStorage.parameterIds;
  // Pastikan timestamp sentinel ada
  if (!dataForStorage.timestamp && firebase && firebase.firestore && firebase.firestore.FieldValue) {
    console.warn("Timestamp sentinel tidak ditemukan di dataToSave, menambahkan kembali.");
    dataForStorage.timestamp = firebase.firestore.FieldValue.serverTimestamp();
  } else if (!dataForStorage.timestamp) {
    // Jika FieldValue tidak ada, gunakan Date object
    console.warn("Firebase FieldValue tidak tersedia, menggunakan timestamp klien.");
    dataForStorage.timestamp = new Date();
  }
  // Pastikan nama histori ada
  if (!dataForStorage.entryName) {
    const firstModelName = dataForStorage.models.length > 0 ? dataForStorage.models[0].name : "Data";
    const date = new Date();
    dataForStorage.entryName = `${firstModelName} - ${date.toLocaleDateString("id-ID")} ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    console.warn("Nama histori tidak ada, membuat default:", dataForStorage.entryName);
  }

  console.log("Data untuk disimpan:", JSON.stringify(dataForStorage, null, 2));

  const firestoreTimeout = 15000;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operasi penyimpanan ke Firestore melebihi ${firestoreTimeout / 1000} detik.`));
    }, firestoreTimeout);
  });
  try {
    const docRef = await Promise.race([db.collection("benchmarkData").add(dataForStorage), timeoutPromise]); // Simpan data yg sudah disalin
    clearTimeout(timeoutId);
    if (docRef && docRef.id) {
      window.toast("Sukses!", { description: `Data berhasil disimpan ke Firebase! (ID: ${docRef.id})`, type: "success", position: "top-right" });
      // Reset form, grafik tetap
      clearFormInputs();
    } else {
      throw new Error("Hasil operasi Firestore tidak valid.");
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error saat menyimpan data ke Firestore:", error);
    let errorMessageText = `Gagal menyimpan data ke Firebase: ${error.message}`;
    if (error.code === "unavailable") {
      errorMessageText += " Layanan Firestore mungkin tidak tersedia.";
    } else if (error.code === "permission-denied") {
      errorMessageText += " Izin ditolak. Periksa Security Rules.";
    } else if (error.message.includes("timeout") || error.message.includes("melebihi")) {
      errorMessageText = `Gagal menyimpan data: ${error.message} Periksa koneksi/status Firebase.`;
    } else if (error.code) {
      errorMessageText += ` (Kode: ${error.code})`;
    }
    window.toast("Gagal Menyimpan", { description: errorMessageText, type: "danger", position: "top-center" });
  }
}

// Memperbarui data di Firestore (mode edit)
async function updateDataInFirestore(docId, dataToUpdate) {
  // dataToUpdate masih memiliki parameterIds
  if (!db) {
    window.toast("Firestore Error", { description: "Firestore tidak terinisialisasi. Tidak dapat update data.", type: "danger", position: "top-center" });
    return;
  }
  if (!docId) {
    window.toast("Update Error", { description: "ID Dokumen untuk update tidak ditemukan.", type: "danger", position: "top-center" });
    return;
  }
  window.toast("Memperbarui...", { description: "Memperbarui data di Firebase...", type: "info", position: "top-center", saveToDb: false });

  // Gunakan shallow copy untuk data storage
  const dataForStorage = { ...dataToUpdate };
  delete dataForStorage.parameterIds; // Hapus ID internal sebelum simpan
  delete dataForStorage.timestamp; // Hapus timestamp agar tidak menimpa yang lama
  // Pastikan nama histori ada (seharusnya sudah diambil dari cache di prepareChartData)
  if (!dataForStorage.entryName) {
    console.warn("Nama histori tidak ada saat update, menggunakan nama model pertama.");
    const firstModelName = dataForStorage.models.length > 0 ? dataForStorage.models[0].name : "Data Update";
    dataForStorage.entryName = firstModelName;
  }
  console.log("Data untuk diupdate:", JSON.stringify(dataForStorage, null, 2));

  const firestoreTimeout = 15000;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operasi update Firestore melebihi ${firestoreTimeout / 1000} detik.`));
    }, firestoreTimeout);
  });
  try {
    await Promise.race([db.collection("benchmarkData").doc(docId).set(dataForStorage, { merge: true }), timeoutPromise]); // Update data yg sudah disalin
    clearTimeout(timeoutId);
    window.toast("Sukses!", { description: `Data berhasil diperbarui di Firebase!`, type: "success", position: "top-right" });

    // Reset state dan form, grafik tetap
    isEditMode = false;
    editingDocId = null;
    generateChartBtn.textContent = "Buat Grafik"; // Kembalikan teks tombol utama
    cancelEditBtn.classList.add("hidden");
    editModeInfo.classList.add("hidden");
    resetChartBtn.classList.remove("hidden"); // Tampilkan tombol reset
    clearFormInputs();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error saat update dokumen ${docId}:`, error);
    let errorMessageText = `Gagal memperbarui data: ${error.message}`;
    if (error.code === "permission-denied") {
      errorMessageText += " Izin ditolak. Periksa Security Rules.";
    } else if (error.message.includes("timeout") || error.message.includes("melebihi")) {
      errorMessageText = `Gagal memperbarui data: ${error.message} Periksa koneksi/status Firebase.`;
    } else if (error.code) {
      errorMessageText += ` (Kode: ${error.code})`;
    }
    window.toast("Gagal Update", { description: errorMessageText, type: "danger", position: "top-center" });
  }
}

// Membuat/memperbarui grafik FusionCharts
function generateChartFromData(chartData, isHistory = false) {
  // Cek parameterNames
  if (!chartData || !chartData.models || !chartData.parameterNames) {
    window.toast("Data Error", { description: "Data tidak valid untuk membuat grafik.", type: "danger", position: "top-right" });
    chartContainerDiv.innerHTML = '<p class="text-center text-red-600 p-4">Gagal memuat grafik: Data tidak valid.</p>';
    if (fusionChartInstance) {
      try {
        fusionChartInstance.dispose();
      } catch (e) {}
      fusionChartInstance = null;
    }
    return; // Hentikan jika data tidak valid
  }

  // Categories (Sumbu X): Nama Model
  const categories = [
    {
      category: chartData.models.map((model) => ({ label: model.name })),
    },
  ];
  // Dataset (Seri): Setiap nama parameter menjadi satu seri
  const dataset = chartData.parameterNames.map((paramName) => {
    // Iterasi berdasarkan nama parameter
    return {
      seriesname: paramName, // Nama seri = nama parameter
      data: chartData.models.map((model) => ({
        // Ambil nilai dari model.scores menggunakan nama parameter
        value: model.scores[paramName] ?? 0, // Default 0 jika tidak ada
      })),
    };
  });

  // Tangani timestamp untuk subjudul
  let subCaptionText = "Data Input Saat Ini"; // Default untuk data baru
  if (isEditMode) {
    subCaptionText = `Mengedit Data (ID: ${editingDocId})`;
  } else if (isHistory && chartData.timestamp) {
    // Hanya format jika timestamp valid
    const formattedTime = formatFirestoreTimestamp(chartData.timestamp);
    if (formattedTime !== "Timestamp tidak valid" && formattedTime !== "Error Format Timestamp") {
      subCaptionText = `Data dari ${formattedTime}`;
    } else {
      subCaptionText = "Data Histori (Timestamp Error)";
    }
  } else if (isHistory) {
    subCaptionText = "Data Histori (Timestamp Tidak Ada)";
  }
  // Jika BUKAN histori dan BUKAN edit mode, coba format timestamp jika ada
  else if (!isHistory && !isEditMode && chartData.timestamp) {
    const formattedTime = formatFirestoreTimestamp(chartData.timestamp);
    if (formattedTime !== "Timestamp tidak valid" && formattedTime !== "Error Format Timestamp") {
      // Opsi: Tampilkan waktu simpan jika berhasil diformat
      // subCaptionText = `Data Tersimpan ${formattedTime}`;
    }
    // Jika masih sentinel atau error, biarkan default "Data Input Saat Ini"
  }

  const dataSource = {
    chart: {
      caption: "Perbandingan Skor Benchmark Model",
      subCaption: subCaptionText, // Gunakan teks subjudul yang sudah diformat/ditangani
      xAxisName: "Model",
      yAxisName: "Skor (%)",
      numberSuffix: "%",
      theme: "fusion",
      yaxismaxvalue: "100",
      drawcrossline: "1",
      decimals: "2",
      forceDecimals: "0",
      plottooltext: "<b>$seriesName</b><br>$label: <b>$dataValue</b>",
    },
    categories: categories,
    dataset: dataset,
  };

  // Render atau update grafik
  if (fusionChartInstance) {
    try {
      fusionChartInstance.setJSONData(dataSource);
    } catch (error) {
      console.error("Gagal update data FusionCharts:", error);
      window.toast("Chart Error", { description: "Terjadi kesalahan saat memperbarui grafik.", type: "danger", position: "top-right" });
      renderNewFusionChart(dataSource);
    }
  } else {
    renderNewFusionChart(dataSource);
  }

  // Panggil generateSummaryTable setelah grafik siap
  generateSummaryTable(chartData);
}

// Fungsi untuk membuat tabel kesimpulan dengan gaya modern
function generateSummaryTable(chartData) {
  const summaryTableDiv = document.getElementById("summaryTable");
  if (!summaryTableDiv) {
    console.error("Elemen #summaryTable tidak ditemukan.");
    return;
  }
  summaryTableDiv.innerHTML = ""; // Kosongkan tabel sebelumnya

  // Validasi data dasar
  if (!chartData || !chartData.parameterNames || chartData.parameterNames.length === 0 || !chartData.models || chartData.models.length === 0) {
    summaryTableDiv.innerHTML = '<p class="text-center text-gray-500 italic p-4">Data tidak cukup untuk membuat kesimpulan.</p>';
    return;
  }

  // Kelas Tailwind untuk gaya modern
  let tableHtml = `
                <h3 class="text-base md:text-lg font-semibold mb-3 text-gray-700 text-center mt-4">Kesimpulan Model Unggulan per Kategori</h3>
                <div class="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">🌟 Kategori Terbaik</th>
                                <th scope="col" class="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">🏆 Model Unggulan</th>
                                <th scope="col" class="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">🏅 Peringkat Model</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">`;

  chartData.parameterNames.forEach((paramName) => {
    let modelsWithScores = chartData.models
      .map((model) => {
        const score = parseFloat(model.scores[paramName]);
        return {
          name: model.name,
          score: isNaN(score) ? -1 : score, // Anggap -1 jika skor tidak valid
        };
      })
      .filter((model) => model.score !== -1) // Hanya model dengan skor valid
      .sort((a, b) => b.score - a.score); // Urutkan dari skor tertinggi

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

    // Tambahkan baris ke tabel dengan gaya baru
    tableHtml += `
                    <tr class="hover:bg-gray-50 transition-colors duration-150">
                        <td class="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">${paramName}</td>
                        <td class="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">
                            ${maxScore === -1 ? '<span class="italic text-gray-400">N/A</span>' : winners.join(" / ")}
                            ${maxScore !== -1 ? ` <span class="text-xs text-gray-400">(${maxScore.toFixed(2)}%)</span>` : ""}
                        </td>
                        <td class="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">${rankingHtml}</td>
                    </tr>`;
  });

  tableHtml += `
                        </tbody>
                    </table>
                </div>`;

  summaryTableDiv.innerHTML = tableHtml;
}

// Handler tombol utama (Buat Grafik & Simpan/Update)
function handleGenerateChartAndSave() {
  const chartData = prepareChartData(); // Validasi & siapkan data (termasuk parameterIds)
  if (chartData) {
    generateChartFromData(chartData, false); // Tampilkan grafik & tabel kesimpulan (butuh parameterIds)

    // Simpan atau update data
    if (isEditMode && editingDocId) {
      updateDataInFirestore(editingDocId, chartData);
    } else {
      saveDataToFirestore(chartData);
    }
  } else {
    // Jika data tidak valid
    chartContainerDiv.innerHTML = "";
    if (summaryTableContainer) summaryTableContainer.innerHTML = '<div id="summaryTable"></div>'; // Kosongkan tabel juga
    if (fusionChartInstance) {
      try {
        fusionChartInstance.dispose();
      } catch (e) {}
      fusionChartInstance = null;
    }
  }
}

// Handler tombol "Reset Grafik"
function handleResetChart() {
  chartContainerDiv.innerHTML = ""; // Kosongkan grafik
  if (summaryTableContainer) summaryTableContainer.innerHTML = '<div id="summaryTable"></div>'; // Kosongkan tabel
  if (fusionChartInstance) {
    try {
      fusionChartInstance.dispose();
    } catch (e) {}
    fusionChartInstance = null;
  }
  window.toast("Grafik Direset", { type: "info", position: "top-right", description: "Grafik dan tabel kesimpulan telah direset.", saveToDb: false });
}

// Render instance FusionCharts baru
function renderNewFusionChart(dataSource) {
  try {
    chartContainerDiv.innerHTML = "";
    fusionChartInstance = new FusionCharts({ type: "mscolumn2d", renderAt: "chartContainer", width: "100%", height: "100%", dataFormat: "json", dataSource: dataSource });
    fusionChartInstance.render();
  } catch (error) {
    console.error("Gagal membuat FusionCharts:", error);
    window.toast("Chart Error", { description: "Terjadi kesalahan saat membuat grafik.", type: "danger", position: "top-right" });
    chartContainerDiv.innerHTML = '<p class="text-center text-red-600 p-4">Gagal memuat grafik.</p>';
    fusionChartInstance = null;
  }
}

// --- Fungsi untuk Histori ---

let recentParameterNamesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

async function getRecentParameterNames() {
  const now = Date.now();
  if (recentParameterNamesCache && now - cacheTimestamp < CACHE_DURATION) {
    return recentParameterNamesCache;
  }

  if (!db) {
    console.warn("Firestore tidak terinisialisasi. Tidak dapat mengambil nama parameter.");
    return [];
  }

  try {
    const querySnapshot = await db.collection("benchmarkData").orderBy("timestamp", "desc").limit(50).get(); // Ambil lebih banyak untuk variasi
    const parameterNamesSet = new Set();
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data && Array.isArray(data.parameterNames)) {
        data.parameterNames.forEach((name) => {
          if (typeof name === "string" && name.trim() !== "") {
            parameterNamesSet.add(name.trim());
          }
        });
      }
    });
    recentParameterNamesCache = Array.from(parameterNamesSet);
    cacheTimestamp = now;
    return recentParameterNamesCache;
  } catch (error) {
    console.error("Error mengambil nama parameter dari histori:", error);
    return [];
  }
}

let activeSuggestionsContainer = null;

async function showParameterSuggestions(inputElement) {
  const wrapper = inputElement.closest(".parameter-input-wrapper");
  if (!wrapper) return;
  const suggestionsContainer = wrapper.querySelector(".parameter-suggestions-container");
  if (!suggestionsContainer) return;

  activeSuggestionsContainer = suggestionsContainer; // Set container aktif

  const uniqueNames = await getRecentParameterNames();
  suggestionsContainer.innerHTML = ""; // Kosongkan saran lama

  if (uniqueNames.length === 0) {
    const noSuggestionItem = document.createElement("div");
    noSuggestionItem.className = "suggestion-item no-suggestions";
    noSuggestionItem.textContent = "Tidak ada histori parameter.";
    suggestionsContainer.appendChild(noSuggestionItem);
  } else {
    uniqueNames.forEach((name) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.textContent = name;
      item.onmousedown = (e) => {
        // Gunakan onmousedown agar blur tidak terjadi sebelum klik
        e.preventDefault(); // Cegah blur pada input
        inputElement.value = name;
        handleParameterNameInput(inputElement); // Update label skor jika ada
        filterParameterSuggestions(inputElement);
      };
      suggestionsContainer.appendChild(item);
    });
  }
  suggestionsContainer.classList.add("active");
  filterParameterSuggestions(inputElement); // Filter berdasarkan input saat ini (jika ada)
}

function hideParameterSuggestionsWithDelay(inputElement) {
  // Delay kecil untuk memungkinkan event klik pada item saran diproses
  setTimeout(() => {
    const wrapper = inputElement.closest(".parameter-input-wrapper");
    if (!wrapper) return;
    const suggestionsContainer = wrapper.querySelector(".parameter-suggestions-container");
    // Hanya sembunyikan jika mouse tidak di atas kontainer saran
    if (suggestionsContainer && !suggestionsContainer.matches(":hover")) {
      suggestionsContainer.classList.remove("active");
      activeSuggestionsContainer = null;
    }
  }, 50);
}

function filterParameterSuggestions(inputElement) {
  const filterText = inputElement.value.toLowerCase();
  const wrapper = inputElement.closest(".parameter-input-wrapper");
  if (!wrapper) return;
  const suggestionsContainer = wrapper.querySelector(".parameter-suggestions-container");
  if (!suggestionsContainer || !suggestionsContainer.classList.contains("active")) return;

  const items = suggestionsContainer.querySelectorAll(".suggestion-item");
  let hasVisibleItems = false;
  items.forEach((item) => {
    if (item.classList.contains("no-suggestions")) return; // Jangan filter item 'no-suggestions'
    const itemName = item.textContent.toLowerCase();
    if (itemName.includes(filterText)) {
      item.style.display = "";
      hasVisibleItems = true;
    } else {
      item.style.display = "none";
    }
  });

  // Tampilkan pesan jika tidak ada yang cocok setelah filter
  let noMatchMsg = suggestionsContainer.querySelector(".no-match-message");
  if (!hasVisibleItems && !suggestionsContainer.querySelector(".no-suggestions")) {
    if (!noMatchMsg) {
      noMatchMsg = document.createElement("div");
      noMatchMsg.className = "suggestion-item no-match-message"; // Gunakan kelas yang sama untuk styling
      noMatchMsg.textContent = "Tidak ada parameter yang cocok.";
      suggestionsContainer.appendChild(noMatchMsg);
    }
    noMatchMsg.style.display = "";
  } else if (noMatchMsg) {
    noMatchMsg.style.display = "none";
  }
}

// Fungsi untuk mengupdate nama histori di Firestore
async function updateHistoryEntryName(docId, newName) {
  if (!db || !docId) {
    console.error("Firestore DB atau Doc ID tidak valid untuk update nama histori.");
    window.toast("Error Internal", { description: "Gagal menyimpan nama histori baru.", type: "danger" });
    return false; // Gagal
  }
  if (!newName || newName.trim() === "") {
    window.toast("Input Error", { description: "Nama histori tidak boleh kosong.", type: "warning" });
    return false; // Gagal
  }

  window.toast("Menyimpan...", { description: `Menyimpan nama histori "${newName}"...`, type: "info" });
  try {
    await db.collection("benchmarkData").doc(docId).update({
      entryName: newName.trim(),
    });
    window.toast("Sukses!", { description: "Nama histori berhasil diperbarui.", type: "success" });
    // Update cache juga
    if (historicalDataCache[docId]) {
      historicalDataCache[docId].entryName = newName.trim();
    }
    return true; // Sukses
  } catch (error) {
    console.error("Error updating history entry name:", error);
    window.toast("Gagal Update Nama", { description: `Gagal menyimpan nama histori: ${error.message}`, type: "danger" });
    return false; // Gagal
  }
}

// Fungsi untuk menangani edit inline nama histori
function enableHistoryNameEditing(spanElement, docId) {
  const currentName = spanElement.textContent;
  const parentDiv = spanElement.parentNode; // Div .history-item

  // Buat input field
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentName;
  input.className = "history-name-input"; // Terapkan gaya CSS baru
  input.dataset.docId = docId; // Simpan docId di input

  // Ganti span dengan input
  parentDiv.insertBefore(input, spanElement);
  spanElement.style.display = "none"; // Sembunyikan span
  input.focus(); // Fokus ke input
  input.select(); // Pilih semua teks

  // Fungsi untuk menyimpan dan kembali ke span
  const saveAndSwitchBack = async () => {
    const newName = input.value.trim();
    // Hanya update jika nama berubah
    if (newName !== currentName && newName !== "") {
      const success = await updateHistoryEntryName(docId, newName);
      if (success) {
        spanElement.textContent = newName; // Update teks span jika berhasil
      } else {
        // Jika gagal, revert ke nama lama di span
        spanElement.textContent = currentName;
        window.toast("Update Gagal", { description: "Nama histori tidak diperbarui.", type: "warning" });
      }
    } else {
      spanElement.textContent = currentName; // Kembalikan teks asli jika tidak ada perubahan atau kosong
    }
    // Hapus input dan tampilkan span lagi
    if (parentDiv.contains(input)) {
      parentDiv.removeChild(input);
    }
    spanElement.style.display = "block";
  };

  // Tambahkan event listener ke input
  input.addEventListener("blur", saveAndSwitchBack);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Cegah submit form jika ada
      saveAndSwitchBack();
    } else if (event.key === "Escape") {
      // Batal edit, kembalikan span dengan nama asli
      if (parentDiv.contains(input)) {
        parentDiv.removeChild(input);
      }
      spanElement.textContent = currentName;
      spanElement.style.display = "block";
    }
  });
}

async function openHistoryModal() {
  if (!db) {
    window.toast("Firestore Error", { description: "Tidak dapat memuat histori: Firestore tidak terinisialisasi.", type: "danger", position: "top-center" });
    return;
  }
  historyModal.classList.remove("hidden");
  // Tampilkan spinner dan teks shimmer
  historyListDiv.innerHTML = `
                <div class="flex flex-col justify-center items-center h-32">
                    <div class="loader mb-4"></div>
                    <p class="shimmer-text text-gray-500 text-sm">Memuat data histori...</p>
                </div>
            `;
  historicalDataCache = {}; // Kosongkan cache
  try {
    const querySnapshot = await db.collection("benchmarkData").orderBy("timestamp", "desc").limit(20).get();
    if (querySnapshot.empty) {
      historyListDiv.innerHTML = '<p class="text-center text-gray-500 p-4">Belum ada data histori.</p>';
      return;
    }
    historyListDiv.innerHTML = ""; // Kosongkan spinner/pesan sebelumnya
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;
      historicalDataCache[docId] = data; // Simpan ke cache

      const historyItemWrapper = document.createElement("div");
      historyItemWrapper.className = "history-item-wrapper";
      historyItemWrapper.dataset.id = docId;

      const historyItem = document.createElement("div");
      historyItem.className = "history-item";

      // Tampilkan nama histori (jika ada) atau default
      const entryName = data.entryName || `Benchmark (${formatFirestoreTimestamp(data.timestamp)})`; // Nama default jika tidak ada
      const nameSpan = document.createElement("span");
      nameSpan.className = "history-entry-name"; // Terapkan gaya CSS
      nameSpan.textContent = entryName;
      nameSpan.title = "Klik untuk edit nama histori"; // Tooltip
      // Tambahkan event listener untuk edit inline
      nameSpan.addEventListener("click", (event) => {
        event.stopPropagation(); // Hentikan event agar tidak trigger loadHistoryEntry
        enableHistoryNameEditing(nameSpan, docId);
      });

      const timeString = formatFirestoreTimestamp(data.timestamp);
      const modelNames =
        (data.models || [])
          .map((m) => m.name)
          .slice(0, 3)
          .join(", ") + ((data.models || []).length > 3 ? "..." : "");

      // Susun elemen di dalam historyItem
      historyItem.appendChild(nameSpan); // Tambahkan span nama
      const timeDiv = document.createElement("div");
      timeDiv.className = "history-item-time";
      timeDiv.textContent = timeString;
      historyItem.appendChild(timeDiv);

      const modelsDiv = document.createElement("div");
      modelsDiv.className = "history-item-models";
      modelsDiv.textContent = `Model: ${modelNames || "Tidak ada"}`;
      historyItem.appendChild(modelsDiv);

      // Listener untuk load grafik tetap di div utama
      historyItem.addEventListener("click", () => loadHistoryEntry(docId));

      const editButton = document.createElement("button");
      editButton.className = "history-action-btn history-edit-btn";
      editButton.innerHTML = "✎";
      editButton.title = "Edit data benchmark ini";
      editButton.addEventListener("click", (event) => {
        event.stopPropagation();
        loadDataForEdit(docId);
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "history-action-btn history-delete-btn";
      deleteButton.innerHTML = "&times;";
      deleteButton.title = "Hapus data histori ini";
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openDeleteConfirmModal(docId);
      });

      historyItemWrapper.appendChild(historyItem);
      historyItemWrapper.appendChild(editButton);
      historyItemWrapper.appendChild(deleteButton);
      historyListDiv.appendChild(historyItemWrapper);
    });
  } catch (error) {
    console.error("Error mengambil histori:", error);
    historyListDiv.innerHTML = `<p class="text-red-600 text-center p-4">Gagal memuat histori: ${error.message}</p>`;
  }
}
function closeHistoryModal() {
  historyModal.classList.add("hidden");
}
// Memuat entri histori ke grafik
function loadHistoryEntry(docId) {
  const data = historicalDataCache[docId];
  if (data) {
    console.log("Memuat data histori:", docId);
    // Data sudah dalam format { scores: { paramName: value } }
    generateChartFromData(data, true); // Tampilkan grafik & tabel kesimpulan
    closeHistoryModal();
    window.toast("Histori Dimuat", { description: `Menampilkan grafik dari histori (${formatFirestoreTimestamp(data.timestamp)})`, type: "info", position: "top-right", saveToDb: false });
    if (isEditMode) {
      cancelEdit();
    } // Keluar mode edit jika sedang aktif
  } else {
    console.error("Data histori tidak ditemukan di cache untuk ID:", docId);
    window.toast("Error", { description: "Gagal memuat data histori yang dipilih.", type: "danger", position: "top-right" });
  }
}
// Buka modal konfirmasi hapus
function openDeleteConfirmModal(docId) {
  if (!docId) return;
  docIdToDelete = docId;
  const data = historicalDataCache[docId];
  const entryName = data ? data.entryName : `ID: ${docId}`;
  deleteConfirmMessage.innerHTML = `Apakah Anda yakin ingin menghapus data histori dari <strong>${entryName}</strong>? Tindakan ini tidak dapat diurungkan.`;
  deleteConfirmModal.classList.remove("hidden");
}
function closeDeleteConfirmModal() {
  deleteConfirmModal.classList.add("hidden");
  docIdToDelete = null;
}
// Eksekusi hapus histori
async function executeDeleteHistoryEntry() {
  if (!docIdToDelete) return;
  const docId = docIdToDelete;
  const itemWrapperToRemove = historyListDiv.querySelector(`.history-item-wrapper[data-id="${docId}"]`);
  confirmDeleteBtn.disabled = true;
  cancelDeleteBtnModal.disabled = true;
  confirmDeleteBtn.textContent = "Menghapus...";
  if (!db) {
    window.toast("Firestore Error", { description: "Firestore tidak terinisialisasi. Tidak dapat menghapus data.", type: "danger", position: "top-center" });
    closeDeleteConfirmModal();
    confirmDeleteBtn.disabled = false;
    cancelDeleteBtnModal.disabled = false;
    confirmDeleteBtn.textContent = "Ya, Hapus";
    return;
  }
  try {
    await db.collection("benchmarkData").doc(docId).delete();
    const data = historicalDataCache[docId];
    const entryName = data ? data.entryName : `ID: ${docId}`;
    if (itemWrapperToRemove) {
      itemWrapperToRemove.remove();
    } // Hapus dari tampilan
    delete historicalDataCache[docId]; // Hapus dari cache
    window.toast("Sukses", { description: `Data histori (${entryName}) berhasil dihapus.`, type: "success", position: "top-right" });
    if (historyListDiv.children.length === 0) {
      historyListDiv.innerHTML = '<p class="text-gray-500">Belum ada data histori.</p>';
    }
  } catch (error) {
    console.error("Error menghapus data histori:", error);
    window.toast("Gagal Menghapus", { description: `Gagal menghapus data histori: ${error.message}`, type: "danger", position: "top-center" });
  } finally {
    closeDeleteConfirmModal();
    confirmDeleteBtn.disabled = false;
    cancelDeleteBtnModal.disabled = false;
    confirmDeleteBtn.textContent = "Ya, Hapus";
  }
}
// Memuat data histori ke form untuk diedit
function loadDataForEdit(docId) {
  const data = historicalDataCache[docId];
  // Validasi data histori (harus punya parameterNames dan models)
  if (!data || !data.parameterNames || !data.models) {
    window.toast("Error", { description: "Data histori tidak ditemukan atau formatnya tidak sesuai untuk diedit.", type: "danger", position: "top-right" });
    if (data) console.error("Data histori tidak valid:", data);
    return;
  }
  console.log("Memuat data untuk diedit:", docId);
  isEditMode = true;
  editingDocId = docId;

  parameterContainer.innerHTML = "";
  modelContainer.innerHTML = ""; // Kosongkan form

  // Buat map paramName ke paramId (ID dibuat baru saat load edit)
  const paramNameToIdMap = {};
  data.parameterNames.forEach((name) => {
    const newId = generateUniqueId("param"); // Selalu buat ID baru saat load edit
    paramNameToIdMap[name] = newId;
    addParameterInput(name, newId); // Tambahkan input parameter dgn ID baru
  });

  // Buat map paramId ke paramName untuk updateModelInputsForGroup
  const paramIdToNameMap = {};
  Object.entries(paramNameToIdMap).forEach(([name, id]) => {
    paramIdToNameMap[id] = name;
  });

  // Isi model dan skor
  data.models.forEach((modelData) => {
    const modelGroup = addModelInput(modelData.name, null); // Tambah model input
    // Isi skor berdasarkan NAMA
    updateModelInputsForGroup(modelGroup, modelData.scores, paramIdToNameMap); // scoresData sudah dalam format { namaParam: skor }
    // Tampilkan skor saat load edit
    const scoresContainer = modelGroup.querySelector(".scores-container");
    const toggleBtn = modelGroup.querySelector(".toggle-scores-btn");
    if (scoresContainer && toggleBtn) {
      scoresContainer.classList.remove("hidden");
      toggleBtn.innerHTML = "Sembunyikan Skor &#9652;"; // Panah atas
    }
  });

  updateRemoveButtons("#parameterContainer", ".parameter-input-group");
  updateRemoveButtons("#modelContainer", ".model-input-group");
  generateChartBtn.textContent = "Update Grafik"; // Ubah teks tombol utama
  cancelEditBtn.classList.remove("hidden");
  resetChartBtn.classList.add("hidden"); // Sembunyikan tombol reset saat edit
  editModeInfo.classList.remove("hidden");
  generateChartFromData(data, true); // Tampilkan grafik & tabel kesimpulan
  closeHistoryModal();
  window.toast("Mode Edit Aktif", { description: `Memuat data dari ${formatFirestoreTimestamp(data.timestamp)} untuk diedit.`, type: "info", position: "top-right", saveToDb: false });
}
// Batal mode edit
function cancelEdit() {
  isEditMode = false;
  editingDocId = null;
  clearFormInputs(); // Reset form (termasuk tabel kesimpulan)
  generateChartBtn.textContent = "Buat Grafik"; // Kembalikan teks tombol utama
  cancelEditBtn.classList.add("hidden");
  resetChartBtn.classList.remove("hidden"); // Tampilkan kembali tombol reset
  editModeInfo.classList.add("hidden");
  chartContainerDiv.innerHTML = ""; // Kosongkan grafik
  if (fusionChartInstance) {
    try {
      fusionChartInstance.dispose();
    } catch (e) {}
    fusionChartInstance = null;
  }
  // Tampilkan toast batal HANYA di sini
  window.toast("Mode Edit Dibatalkan", { type: "info", position: "top-right" });
}

// --- Fungsi untuk Notifikasi ---
async function saveNotificationToFirestore(message, options) {
  if (!db) return; // Jangan simpan jika DB tidak siap

  const notificationData = {
    message: message,
    description: options.description || "",
    type: options.type || "default",
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection(notificationsCollection).add(notificationData);
    console.log("Notifikasi disimpan ke Firestore:", notificationData);
    fetchAndUpdateNotificationBadge(); // Update badge setelah menyimpan
  } catch (error) {
    console.error("Error saving notification to Firestore:", error);
  }
}

async function fetchAndUpdateNotificationBadge() {
  if (!db || !notificationBadge) return;
  try {
    const querySnapshot = await db.collection(notificationsCollection).get();
    const count = querySnapshot.size;
    updateNotificationBadge(count);
  } catch (error) {
    console.error("Error fetching notification count:", error);
  }
}

function updateNotificationBadge(count) {
  if (!notificationBadge) return;
  if (count > 0) {
    notificationBadge.textContent = count > 99 ? "99+" : count;
    notificationBadge.classList.remove("hidden");
  } else {
    notificationBadge.textContent = "0";
    notificationBadge.classList.add("hidden");
  }
}

async function openNotificationModal() {
  if (!db) {
    window.toast("Firestore Error", { description: "Tidak dapat memuat notifikasi: Firestore tidak terinisialisasi.", type: "danger", position: "top-center" });
    return;
  }
  notificationModal.classList.remove("hidden");
  // Tampilkan spinner
  notificationListDiv.innerHTML = `
                <div class="flex flex-col justify-center items-center h-32">
                    <div class="loader mb-4"></div>
                    <p class="shimmer-text text-gray-500 text-sm">Memuat notifikasi...</p>
                </div>
            `;

  try {
    const querySnapshot = await db.collection(notificationsCollection).orderBy("timestamp", "desc").limit(50).get(); // Batasi jumlah notif
    displayNotifications(querySnapshot);
    updateNotificationBadge(querySnapshot.size); // Update badge saat modal dibuka
  } catch (error) {
    console.error("Error fetching notifications:", error);
    notificationListDiv.innerHTML = `<p class="text-red-600 text-center p-4">Gagal memuat notifikasi: ${error.message}</p>`;
  }
}

function displayNotifications(querySnapshot) {
  notificationListDiv.innerHTML = ""; // Hapus loading/konten lama
  if (querySnapshot.empty) {
    notificationListDiv.innerHTML = '<p class="text-center text-gray-500 p-4">Tidak ada notifikasi.</p>';
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const docId = doc.id;

    const card = document.createElement("div");
    card.className = "notification-card";
    // Tambahkan kelas border berdasarkan tipe
    switch (data.type) {
      case "success":
        card.classList.add("notification-card-success");
        break;
      case "info":
        card.classList.add("notification-card-info");
        break;
      case "warning":
        card.classList.add("notification-card-warning");
        break;
      case "danger":
        card.classList.add("notification-card-danger");
        break;
      default:
        card.classList.add("notification-card-default");
        break;
    }

    const contentDiv = document.createElement("div");
    contentDiv.className = "notification-card-content";

    const messageP = document.createElement("p");
    messageP.className = "notification-card-message";
    messageP.textContent = data.message;
    contentDiv.appendChild(messageP);

    if (data.description) {
      const descriptionP = document.createElement("p");
      descriptionP.className = "notification-card-description";
      descriptionP.textContent = data.description;
      contentDiv.appendChild(descriptionP);
    }

    const timeP = document.createElement("p");
    timeP.className = "notification-card-time";
    timeP.textContent = formatFirestoreTimestamp(data.timestamp);
    contentDiv.appendChild(timeP);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "notification-delete-btn";
    deleteBtn.innerHTML = "&times;"; // Karakter 'x'
    deleteBtn.title = "Hapus notifikasi ini";
    deleteBtn.onclick = (event) => {
      event.stopPropagation(); // Cegah event lain
      openDeleteNotificationConfirmModal(docId, card);
    };

    card.appendChild(contentDiv);
    card.appendChild(deleteBtn);
    notificationListDiv.appendChild(card);
  });
}

function closeNotificationModal() {
  notificationModal.classList.add("hidden");
}

function openDeleteNotificationConfirmModal(docId, cardElement) {
  notificationDocIdToDelete = docId;
  notificationElementToDelete = cardElement;
  deleteNotificationConfirmMessage.textContent = `Apakah Anda yakin ingin menghapus notifikasi ini?`;
  deleteNotificationConfirmModal.classList.remove("hidden");
}

function closeDeleteNotificationConfirmModal() {
  deleteNotificationConfirmModal.classList.add("hidden");
  notificationDocIdToDelete = null;
  notificationElementToDelete = null;
}

async function executeDeleteNotification() {
  if (!notificationDocIdToDelete || !notificationElementToDelete) return;
  const docId = notificationDocIdToDelete;
  const element = notificationElementToDelete;

  confirmDeleteNotificationBtn.disabled = true;
  cancelDeleteNotificationBtn.disabled = true;
  confirmDeleteNotificationBtn.textContent = "Menghapus...";

  if (!db) {
    window.toast("Firestore Error", { description: "Firestore tidak terinisialisasi.", type: "danger", saveToDb: false });
    closeDeleteNotificationConfirmModal();
    confirmDeleteNotificationBtn.disabled = false;
    cancelDeleteNotificationBtn.disabled = false;
    confirmDeleteNotificationBtn.textContent = "Ya, Hapus";
    return;
  }

  try {
    await db.collection(notificationsCollection).doc(docId).delete();
    element.remove();
    window.toast("Sukses", { description: "Notifikasi berhasil dihapus.", type: "success", saveToDb: false });

    // *** PERBAIKAN: Panggil fetchAndUpdateNotificationBadge setelah operasi DB selesai ***
    await fetchAndUpdateNotificationBadge();

    if (notificationListDiv.querySelectorAll(".notification-card").length === 0) {
      notificationListDiv.innerHTML = '<p class="text-center text-gray-500 p-4">Tidak ada notifikasi.</p>';
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    window.toast("Gagal Hapus", { description: `Gagal menghapus notifikasi: ${error.message}`, type: "danger", saveToDb: false });
  } finally {
    closeDeleteNotificationConfirmModal();
    confirmDeleteNotificationBtn.disabled = false;
    cancelDeleteNotificationBtn.disabled = false;
    confirmDeleteNotificationBtn.textContent = "Ya, Hapus";
  }
}

function openClearAllNotificationsConfirmModal() {
  clearAllNotificationsConfirmModal.classList.remove("hidden");
}

function closeClearAllNotificationsConfirmModal() {
  clearAllNotificationsConfirmModal.classList.add("hidden");
}

async function executeClearAllNotifications() {
  confirmClearAllNotificationsBtn.disabled = true;
  cancelClearAllNotificationsBtn.disabled = true;
  confirmClearAllNotificationsBtn.textContent = "Menghapus...";

  if (!db) {
    window.toast("Firestore Error", { description: "Firestore tidak terinisialisasi.", type: "danger", saveToDb: false });
    closeClearAllNotificationsConfirmModal();
    confirmClearAllNotificationsBtn.disabled = false;
    cancelClearAllNotificationsBtn.disabled = false;
    confirmClearAllNotificationsBtn.textContent = "Ya, Hapus Semua";
    return;
  }

  try {
    const querySnapshot = await db.collection(notificationsCollection).get();
    const batch = db.batch();
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    notificationListDiv.innerHTML = '<p class="text-center text-gray-500 p-4">Tidak ada notifikasi.</p>';
    window.toast("Sukses", { description: "Semua notifikasi berhasil dihapus.", type: "success", saveToDb: false });
    updateNotificationBadge(0); // Update badge setelah menghapus semua
  } catch (error) {
    console.error("Error clearing all notifications:", error);
    window.toast("Gagal Hapus Semua", { description: `Gagal menghapus semua notifikasi: ${error.message}`, type: "danger", saveToDb: false });
  } finally {
    closeClearAllNotificationsConfirmModal();
    confirmClearAllNotificationsBtn.disabled = false;
    cancelClearAllNotificationsBtn.disabled = false;
    confirmClearAllNotificationsBtn.textContent = "Ya, Hapus Semua";
  }
}

// --- Event Listeners ---
addParameterBtn.addEventListener("click", () => addParameterInput());
addModelBtn.addEventListener("click", () => addModelInput());
generateChartBtn.addEventListener("click", handleGenerateChartAndSave); // Tombol utama
resetChartBtn.addEventListener("click", handleResetChart); // Tombol reset
viewHistoryBtn.addEventListener("click", openHistoryModal);
cancelEditBtn.addEventListener("click", cancelEdit); // Tombol Batal Edit memanggil fungsi ini
closeHistoryModalBtn.addEventListener("click", closeHistoryModal);
historyModal.addEventListener("click", (event) => {
  if (event.target === historyModal) {
    closeHistoryModal();
  }
}); // Klik luar modal histori
cancelDeleteBtnModal.addEventListener("click", closeDeleteConfirmModal);
confirmDeleteBtn.addEventListener("click", executeDeleteHistoryEntry);
if (closeDeleteConfirmModalBtn) {
  closeDeleteConfirmModalBtn.addEventListener("click", closeDeleteConfirmModal);
}
deleteConfirmModal.addEventListener("click", (event) => {
  if (event.target === deleteConfirmModal) {
    closeDeleteConfirmModal();
  }
}); // Klik luar modal hapus

// Event Listener Notifikasi
if (viewNotificationBtn) {
  viewNotificationBtn.addEventListener("click", openNotificationModal);
}
if (closeNotificationModalBtn) {
  closeNotificationModalBtn.addEventListener("click", closeNotificationModal);
}
if (notificationModal) {
  notificationModal.addEventListener("click", (event) => {
    if (event.target === notificationModal) {
      closeNotificationModal();
    }
  });
}
if (clearAllNotificationsBtn) {
  clearAllNotificationsBtn.addEventListener("click", openClearAllNotificationsConfirmModal);
}
// Listener untuk modal konfirmasi hapus notifikasi
if (cancelDeleteNotificationBtn) {
  cancelDeleteNotificationBtn.addEventListener("click", closeDeleteNotificationConfirmModal);
}
if (confirmDeleteNotificationBtn) {
  confirmDeleteNotificationBtn.addEventListener("click", executeDeleteNotification);
}
if (deleteNotificationConfirmModal) {
  deleteNotificationConfirmModal.addEventListener("click", (event) => {
    if (event.target === deleteNotificationConfirmModal) {
      closeDeleteNotificationConfirmModal();
    }
  });
}
// Listener untuk modal konfirmasi hapus semua notifikasi
if (cancelClearAllNotificationsBtn) {
  cancelClearAllNotificationsBtn.addEventListener("click", closeClearAllNotificationsConfirmModal);
}
if (confirmClearAllNotificationsBtn) {
  confirmClearAllNotificationsBtn.addEventListener("click", executeClearAllNotifications);
}
if (clearAllNotificationsConfirmModal) {
  clearAllNotificationsConfirmModal.addEventListener("click", (event) => {
    if (event.target === clearAllNotificationsConfirmModal) {
      closeClearAllNotificationsConfirmModal();
    }
  });
}

// --- Inisialisasi Awal ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");
  // Beri ID unik ke elemen awal jika belum ada
  parameterContainer.querySelectorAll(".parameter-input-group:not([data-param-id])").forEach((el, i) => (el.dataset.paramId = `param_initial_${i}`));
  modelContainer.querySelectorAll(".model-input-group:not([data-model-id])").forEach((el, i) => (el.dataset.modelId = `model_initial_${i}`));

  updateModelInputs(); // Update skor awal
  parameterContainer.querySelectorAll(".parameter-input-group").forEach(addDragDropListeners); // Tambah D&D
  modelContainer.querySelectorAll(".model-input-group").forEach(addDragDropListenersForModel); // Tambah D&D
  parameterContainer.querySelectorAll(".parameter-name").forEach((input) => {
    input.addEventListener("input", () => handleParameterNameInput(input));
  }); // Listener nama param
  updateRemoveButtons("#parameterContainer", ".parameter-input-group"); // Status tombol hapus awal
  updateRemoveButtons("#modelContainer", ".model-input-group");

  // Panggil inisialisasi Firebase setelah DOM siap,
  // Alpine akan menginisialisasi komponennya sendiri setelahnya
  initializeFirebase();
});

// GSAP Preloader Animation
window.onload = () => {
  const preloader = document.getElementById("preloader");
  if (preloader) {
    gsap.to(preloader, {
      opacity: 0,
      duration: 0.8, // Durasi fade out
      ease: "power2.inOut",
      onComplete: () => {
        preloader.style.display = "none"; // Sembunyikan setelah animasi
      },
    });
  }
};
