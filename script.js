

const ITEMS_KEY = "campusflow_items";
const SETTINGS_KEY = "campusflow_settings";

let items = []

let settings = {
    weeklyTarget: 15,
    weeklyCap: 40,
    name: "",
    theme: "dark"
}

let currentFilter = "all";
let sortDescending = false;
let confirmAction = null;

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuButton = document.getElementById("menu-button");
const searchInput = document.getElementById("search-input");
const regexCheckbox = document.getElementById("regex-checkbox");
const tagSelect = document.getElementById("tag-select");
const sortSelect = document.getElementById("sort-select");
const directionButton = document.getElementById("direction-button")
const itemsBody = document.getElementById("items-body");
const itemForm = document.getElementById("item-form");
const modal = document.getElementById("modal");

const {validateTitle, validateTags, validateDuration, validateDate, compileSearchRegex, escapeRegExp } = CampusRules;

function loadData() {
    try {
        const savedItems = localStorage.getItem(ITEMS_KEY);
        if (savedItems) {
            items = JSON.parse(savedItems);
        }
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if(savedSettings) {
            settings = Object.assign(settings, JSON.parse(savedSettings));
        }
    } catch (error) {
        items = [];
    }
}

function saveItems() {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// helper functions

function Ids() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escape(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML.replace(/"/g, "&quot;");
}

function Dateformat(isoDate) {
    if (!isoDate) {
        return "-";
    }
    const date = new Date(isoDate);
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDuration(minutes) {
    if(!minutes) {
        return "-";
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    let text = "";
    if(hours > 0) {
        text += hours + "h"
    }
    if (rest > 0) {
        text += rest + "m";
    }
    return text.trim();
}

function priorityName(priority) {
    if (priority === 1) return "Low";
    if(priority === 3) return "High";
    return "Medium";
}

function isOverdue(item) {
    return item.type === "task" && !item.done && item.date && new Date(item.date) < new Date();
}

function getStartOfWeek() {
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysSinceMonday = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - daysSinceMonday);
    return monday; 
}

function toInputValue(isoDate) {
    const date = new Date(isoDate);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function findItem(id) {
    for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            return items[i];
        }
        
    }
    return null;
}

function showToast(message, kind) {
    const toast = document.createElement("div");
    toast.className = "toast " + (kind || "");
    toast.textContent = message;
    document.getElementById("toasts").appendChild(toast);

    setTimeout(function () {
        toast.remove();
    }, 2600);
}

// Showing pages and the phone menu

function openMenu() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    menuButton.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
}

function showPage(pageName) {
    const pages = document.querySelectorAll(".page");
    for (let i = 0; i < pages.length; i++) {
        pages[i].classList.remove("active");
    }
    document.getElementById("page-" + pageName).classList.add("active");

    const navButtons = document.querySelectorAll(".nav-button");
    for(let i = 0; i < navButtons.length; i++) {
        const isThisPage = navButtons[i].dataset.page === pageName;
        navButtons[i].classList.toggle("active", isThisPage);
    }

    closeMenu();
    window.scrollTo(0,0);

    if (pageName === "dashboard") {
        renderDashboard();
    }
    if (pageName === "list") {
        renderList();
    }
}

function goToPage(pageName) {
    if (pageName === "editor") {
        resetForm();
    }
    showPage(pageName);
}

const pageButtons = document.querySelectorAll("[data-page]");
for (let i = 0; i < pageButtons.length; i++) {
    pageButtons[i].addEventListener("click", function () {
        goToPage(this.dataset.page);
    })
}

menuButton.addEventListener("click", function () {
    if (sidebar.classList.contains("open")) {
        closeMenu();
    } else {
        openMenu();
    }
});

overlay.addEventListener("click", closeMenu);

function getLast7Days() {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        days.push({
            date: day,
            label: day.toLocaleDateString(undefined, { weekday: "short"}),
            hours: 0
        })
    }

    items.forEach(function (item) {
        if (!item.date || !item.duration) {
            return;
        }
        const itemDay = new Date(item.date);
        itemDay.setHours(0, 0, 0, 0)

        days.forEach(function (day) {
            if (day.date.getTime() === itemDay.getTime()) {
                day.hours += item.duration / 60;
            }
        })
    })
    return days
}

function renderDashboard() {
    let greeting = "Welcome back";
    if(settings.name) {
        greeting += ", " + settings.name;
    }
    document.getElementById("greeting").textContent = greeting + " 👋 Here's your week at a glance. ";

    const startOfWeek = getStartOfWeek();

    const openItems = items.filter(function (item) {
        return !(item.type === "task" && item.done);
    })

    const doneThisWeek = items.filter(function (item) {
        return item.type === "task" && item.done && item.doneAt && new Date(item.doneAt) >= startOfWeek;
    })

    const overdueItems = items.filter(isOverdue);

    const weekMinutes = items.filter(function (item) {
        return item.date && item.duration && new Date(item.date) >= startOfWeek
    }).reduce(function (total, item) {
        return total + item.duration;
    }, 0);
    const weekHours = weekMinutes / 60;

    document.getElementById("stat-open").textContent = openItems.length;
    document.getElementById("stat-done").textContent = doneThisWeek.length;
    document.getElementById("stat-overdue").textContent = overdueItems.length;
    document.getElementById("stat-hours").textContent = weekHours.toFixed(1);

    renderChart();
    renderTarget(weekHours);
    renderUpcoming();
}

function renderChart() {
    const days = getLast7Days();

    let maxHours = 1
    days.forEach(function (day) {
        if(day.hours > maxHours) {
            maxHours = day.hours;
        }
    });

    let html = "";
    days.forEach(function (day) {
        const height = Math.max(2, (day.hours / maxHours) * 85);
        const value = day.hours > 0 ? day.hours.toFixed(1) : "";
        html += '<div class="chart-column">' + '<div class="chart-track">' + '<div class="chart-bar" style="height:' +height + '%">' + '<span class="chart-value">' + value + "</span>" + "</div>" + "</div>" + '<span class="chart-label">' + day.label + "</span>" + "</div>";

    });
    document.getElementById("chart").innerHTML = html;
}

function renderTarget(weekHours) {
    document.getElementById("target-hours").textContent = weekHours.toFixed(1);
    document.getElementById("target-goal").textContent = settings.weeklyTarget;

    let percent = 0;
    if (settings.weeklyTarget > 0) {
        percent = Math.min(100, (weekHours / settings.weeklyTarget) * 100);
    }
    document.getElementById("progress-fill").style.width = percent + "%";

    const overCap = settings.weeklyCap > 0 && weekHours > settings.weeklyCap;
    document.getElementById("progress-bar").classList.toggle("over", overCap);

    let message;
    if(overCap) {
        message = "⚠️ You have logged " + weekHours.toFixed(1) + "h, over your " + settings.weeklyCap + "h cap. Take a break!";
    } else if (settings.weeklyTarget > 0 && weekHours >= settings.weeklyTarget) {
        message = "🎉 Target reached! " + weekHours.toFixed(1) + "h of " + settings.weeklyTarget + "h.";
    } else {
        const hoursLeft = Math.max(0, settings.weeklyTarget - weekHours);
        message = hoursLeft.toFixed(1) + "h to go to hit your weekly target."
    }
    document.getElementById("target-message").textContent = message;
}

function renderUpcoming() {
  const now = new Date();

  
  const upcoming = items
    .filter(function (item) {
      return !(item.type === "task" && item.done) && item.date && new Date(item.date) >= now;
    })
    .sort(function (a, b) {
      return new Date(a.date) - new Date(b.date);
    })
    .slice(0, 5);

  const box = document.getElementById("upcoming");

  if (upcoming.length === 0) {
    box.innerHTML = '<p class="small-text">Nothing scheduled. Enjoy the calm 🌿</p>';
    return;
  }

  let html = "";
  upcoming.forEach(function (item) {
    const typeText = item.type === "task" ? "📋 Task" : "📅 Event";
    html += '<div class="upcoming-row">' +
              "<div>" +
                '<span class="badge ' + item.type + '">' + typeText + "</span> " +
                "<strong>" + escape(item.title) + "</strong>" +
              "</div>" +
              '<span class="upcoming-date">' + Dateformat(item.date) + "</span>" +
            "</div>";
  });
  box.innerHTML = html;
}





function fillTagSelect() {
  const chosen = tagSelect.value;
  const tags = [];

  items.forEach(function (item) {
    item.tags.forEach(function (tag) {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });
  });
  tags.sort();

  let html = '<option value="">All tags</option>';
  tags.forEach(function (tag) {
    html += '<option value="' + escape(tag) + '">#' + escape(tag) + "</option>";
  });
  tagSelect.innerHTML = html;
  tagSelect.value = chosen;
}


function matchesFilter(item) {
  if (currentFilter === "task") return item.type === "task";
  if (currentFilter === "event") return item.type === "event";
  if (currentFilter === "open") return !(item.type === "task" && item.done);
  if (currentFilter === "done") return item.type === "task" && item.done;
  if (currentFilter === "overdue") return isOverdue(item);
  return true; // "all"
}


let highlightRegex = null;


function highlightText(text) {
  if (!highlightRegex || !text) {
    return escape(text);
  }
  let result = "";
  let last = 0;
  let match;
  highlightRegex.lastIndex = 0;
  while ((match = highlightRegex.exec(text)) !== null) {
    if (match[0] === "") {
      highlightRegex.lastIndex++; 
      continue;
    }
    result += escapeHtml(text.slice(last, match.index)) +
              "<mark>" + escapeHtml(match[0]) + "</mark>";
    last = match.index + match[0].length;
  }
  return result + escapeHtml(text.slice(last));
}

function matchesSearch(item, searchText, regex) {
  if (searchText === "") {
    return true;
  }
  const tagText = item.tags.map(function (tag) {
    return "#" + tag;
  }).join(" ");
  const everything = item.title + " " + item.notes + " " + tagText;

  if (regex) {
    return regex.test(everything);
  }
  return everything.toLowerCase().includes(searchText.toLowerCase());
}

function getVisibleItems() {
  const searchText = searchInput.value.trim();
  const chosenTag = tagSelect.value;
  const errorBox = document.getElementById("regex-error");
  let regex = null;

  errorBox.style.display = "none";
  highlightRegex = null;

  if (searchText !== "") {
    
    if (regexCheckbox.checked) {
      const result = compileSearchRegex(searchText);
      if (result.error) {
        errorBox.textContent = "Invalid regex: " + result.error;
        errorBox.style.display = "block";
        return items.slice(); 
      }
      regex = result.regex;
    }

    // Global version of the same pattern, used to wrap matches in <mark>
    highlightRegex = new RegExp(regex ? regex.source : escapeRegExp(searchText), "gi");
  }

  const visible = items.filter(function (item) {
    if (!matchesFilter(item)) return false;
    if (chosenTag !== "" && !item.tags.includes(chosenTag)) return false;
    return matchesSearch(item, searchText, regex);
  });

  return sortItems(visible);
}

function sortItems(list) {
  const sortBy = sortSelect.value;

  list.sort(function (a, b) {
    let first;
    let second;

    if (sortBy === "title") {
      first = a.title.toLowerCase();
      second = b.title.toLowerCase();
    } else if (sortBy === "type") {
      first = a.type;
      second = b.type;
    } else if (sortBy === "duration") {
      first = a.duration || 0;
      second = b.duration || 0;
    } else if (sortBy === "priority") {
      first = a.priority;
      second = b.priority;
    } else {
      
      first = a.date ? new Date(a.date).getTime() : Infinity;
      second = b.date ? new Date(b.date).getTime() : Infinity;
    }

    if (first < second) return -1;
    if (first > second) return 1;
    return 0;
  });

  if (sortDescending) {
    list.reverse();
  }
  return list;
}


function buildRow(item) {
  const isTask = item.type === "task";
  const overdue = isOverdue(item);

  
  let status = "";
  if (isTask) {
    if (item.done) {
      status = '<span class="badge done">✓ Done</span>';
    } else if (overdue) {
      status = '<span class="badge overdue">Overdue</span>';
    } else {
      status = '<span class="badge todo">To do</span>';
    }
  }

  
  let checkbox = "";
  if (isTask) {
    checkbox = '<input type="checkbox" class="done-box" data-id="' + item.id + '"' +
               (item.done ? " checked" : "") + ' aria-label="Mark as done">';
  }

 
  let tags = "—";
  if (item.tags.length > 0) {
    tags = item.tags.map(function (tag) {
      return '<span class="tag">' + highlightText("#" + tag) + "</span>";
    }).join("");
  }

  const titleClass = item.done ? "finished" : "";
  const notes = item.notes ? '<span class="note-text">' + highlightText(item.notes.slice(0, 80))+ "</span>" : "";
  const dateClass = overdue ? "overdue-date" : "";
  const typeText = isTask ? "📋 Task" : "📅 Event";

  return "<tr>" +
    '<td class="check-cell">' + checkbox + "</td>" +
    '<td class="title-cell"><span class="' + titleClass + '">' + highlightText(item.title) + "</span> " + status + notes + "</td>" +
    '<td data-label="Type"><span class="badge ' + item.type + '">' + typeText + "</span></td>" +
    '<td data-label="Date" class="' + dateClass + '">' +Dateformat(item.date) + "</td>" +
    '<td data-label="Duration">' + formatDuration(item.duration) + "</td>" +
    '<td data-label="Priority">' + priorityName(item.priority) + "</td>" +
    '<td class="tags-cell" data-label="Tags">' + tags + "</td>" +
    '<td class="actions-cell">' +
      '<button class="button small-button edit-button" data-id="' + item.id + '" aria-label="Edit">✏️</button> ' +
      '<button class="button small-button delete-button" data-id="' + item.id + '" aria-label="Delete">🗑️</button>' +
    "</td>" +
    "</tr>";
}

function renderList() {
  fillTagSelect();
  const visible = getVisibleItems();

  let html = "";
  for (let i = 0; i < visible.length; i++) {
    html += buildRow(visible[i]);
  }
  itemsBody.innerHTML = html;

  
  const hasItems = visible.length > 0;
  document.getElementById("items-table").style.display = hasItems ? "" : "none";
  document.getElementById("empty-message").style.display = hasItems ? "none" : "block";
  document.getElementById("count-message").textContent =
    "Showing " + visible.length + " of " + items.length + " item(s).";

  directionButton.textContent = sortDescending ? "▼" : "▲";
}


searchInput.addEventListener("input", renderList);
regexCheckbox.addEventListener("change", renderList);
tagSelect.addEventListener("change", renderList);
sortSelect.addEventListener("change", renderList);

directionButton.addEventListener("click", function () {
  sortDescending = !sortDescending;
  renderList();
});

const chips = document.querySelectorAll(".chip");
for (let i = 0; i < chips.length; i++) {
  chips[i].addEventListener("click", function () {
    currentFilter = this.dataset.filter;
    for (let j = 0; j < chips.length; j++) {
      chips[j].classList.toggle("active", chips[j] === this);
    }
    renderList();
  });
}


itemsBody.addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  if (button.classList.contains("edit-button")) {
    startEdit(button.dataset.id);
  }
  if (button.classList.contains("delete-button")) {
    askDelete(button.dataset.id);
  }
});


itemsBody.addEventListener("change", function (event) {
  if (!event.target.classList.contains("done-box")) {
    return;
  }
  const item = findItem(event.target.dataset.id);
  if (item) {
    item.done = event.target.checked;
    item.doneAt = item.done ? new Date().toISOString() : null;
    saveItems();
    renderList();
    showToast(item.done ? "Marked as done ✅" : "Marked as to do", "good");
  }
});


// Which validator checks which field, and where its message is shown
const FIELD_RULES = {
  "item-title":    { errorId: "title-error",    check: validateTitle },
  "item-date":     { errorId: "date-error",     check: validateDate },
  "item-duration": { errorId: "duration-error", check: validateDuration },
  "item-tags":     { errorId: "tags-error",     check: validateTags }
};

// Check one field and show (or clear) its inline message
function checkField(fieldId) {
  const rule = FIELD_RULES[fieldId];
  const input = document.getElementById(fieldId);
  const result = rule.check(input.value);
  document.getElementById(rule.errorId).textContent = result.valid ? "" : result.message;
  input.classList.toggle("invalid", !result.valid);
  input.setAttribute("aria-invalid", result.valid ? "false" : "true");
  return result;
}

function clearFormErrors() {
  Object.keys(FIELD_RULES).forEach(function (fieldId) {
    const input = document.getElementById(fieldId);
    document.getElementById(FIELD_RULES[fieldId].errorId).textContent = "";
    input.classList.remove("invalid");
    input.setAttribute("aria-invalid", "false");
  });
}

// Real-time feedback while typing
Object.keys(FIELD_RULES).forEach(function (fieldId) {
  document.getElementById(fieldId).addEventListener("input", function () {
    checkField(fieldId);
  });
});

function resetForm() {
  itemForm.reset();
  document.getElementById("item-id").value = "";
  document.getElementById("item-priority").value = "2";
  document.getElementById("editor-title").textContent = "Add item";
  clearFormErrors();
}


function startEdit(id) {
  const item = findItem(id);
  if (!item) {
    return;
  }
  document.getElementById("item-id").value = item.id;
  document.getElementById("item-type").value = item.type;
  document.getElementById("item-title").value = item.title;
  document.getElementById("item-date").value = item.date ? toInputValue(item.date) : "";
  document.getElementById("item-duration").value = item.duration || "";
  document.getElementById("item-priority").value = item.priority;
  document.getElementById("item-tags").value = item.tags.join(", ");
  document.getElementById("item-notes").value = item.notes;
  clearFormErrors();

  showPage("editor");
  document.getElementById("editor-title").textContent = "Edit item";
  document.getElementById("item-title").focus();
}

itemForm.addEventListener("submit", function (event) {
  event.preventDefault(); 

    
  const results = {};
  let firstInvalid = null;
  Object.keys(FIELD_RULES).forEach(function (fieldId) {
    results[fieldId] = checkField(fieldId);
    if (!results[fieldId].valid && firstInvalid === null) {
      firstInvalid = fieldId;
    }
  });
  if (firstInvalid !== null) {
    document.getElementById(firstInvalid).focus();
    showToast("Please fix the highlighted fields", "bad");
    return;
  }

  const title = document.getElementById("item-title").value.trim();
  const tags = results["item-tags"].tags;

  const dateValue = document.getElementById("item-date").value;
  const durationValue = document.getElementById("item-duration").value;

  const details = {
    title: title,
    type: document.getElementById("item-type").value,
    date: dateValue ? new Date(dateValue).toISOString() : null,
    duration: durationValue ? Number(durationValue) : null,
    priority: Number(document.getElementById("item-priority").value),
    tags: tags,
    notes: document.getElementById("item-notes").value.trim()
  };

  const id = document.getElementById("item-id").value;

  if (id) {
    
    Object.assign(findItem(id), details);
    showToast("Item updated ✓", "good");
  } else {
    
    details.id = Ids();
    details.done = false;
    details.doneAt = null;
    items.push(details);
    showToast("Item added 🎉", "good");
  }

  saveItems();
  resetForm();
  showPage("list");
});

document.getElementById("cancel-button").addEventListener("click", function () {
  resetForm();
  showPage("list");
});




function openModal(title, text, action) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-text").textContent = text;
  confirmAction = action;
  modal.classList.add("show");
  document.getElementById("modal-confirm").focus();
}

function closeModal() {
  modal.classList.remove("show");
  confirmAction = null;
}

function askDelete(id) {
  const item = findItem(id);
  if (!item) {
    return;
  }
  openModal("Delete item?", "“" + item.title + "” will be permanently removed.", function () {
    items = items.filter(function (other) {
      return other.id !== id;
    });
    saveItems();
    renderList();
    showToast("Item deleted", "good");
  });
}

document.getElementById("modal-cancel").addEventListener("click", closeModal);

document.getElementById("modal-confirm").addEventListener("click", function () {
  const action = confirmAction;
  closeModal();
  if (action) {
    action();
  }
});


modal.addEventListener("click", function (event) {
  if (event.target === modal) {
    closeModal();
  }
});




function applyTheme() {
  document.documentElement.setAttribute("data-theme", settings.theme);
  document.getElementById("setting-theme").value = settings.theme;
}

function fillSettingsForm() {
  document.getElementById("setting-target").value = settings.weeklyTarget;
  document.getElementById("setting-cap").value = settings.weeklyCap;
  document.getElementById("setting-name").value = settings.name;
}

document.getElementById("save-settings-button").addEventListener("click", function () {
  settings.weeklyTarget = Math.max(0, Number(document.getElementById("setting-target").value) || 0);
  settings.weeklyCap = Math.max(0, Number(document.getElementById("setting-cap").value) || 0);
  settings.name = document.getElementById("setting-name").value.trim();
  saveSettings();
  showToast("Settings saved ✓", "good");
});

document.getElementById("setting-theme").addEventListener("change", function () {
  settings.theme = this.value;
  applyTheme();
  saveSettings();
});

function exportData() {
    const backup = {
        exported: new Date().toISOString(),
        settings: settings,
        items: items
    };
    const text = JSON.stringify(backup, null, 2);
    const file = Blob([text], {type: "application/json "});

    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "campusflow-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    URL.revokeObjectURL(link.href);

    showToast("Exported JSON ⬇️", "good");

}

document.getElementById("export-button").addEventListener("click", exportData);
document.getElementById("export-button-2").addEventListener("click", exportData);

document.getElementById("import-button").addEventListener("click", function () {
    document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if(!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function () {
        try {
            const data = JSON.parse(reader.result);
            const list = Array.isArray(data) ? data : data.items
            if(!Array.isArray(list)) {
                throw new Error("No items found in this file")
            }

            items = list.map(function (item) {
              return {
                id: String(item.id || Ids()),
                title: item.title || "Untitled",
                type: item.type === "event" ? "event" : "task",
                date: item.date || null,
                priority: Number(item.priority) || 2,
                tags: Array.isArray(item.tags) ? item.tags : [],
                notes: item.notes || "",
                done: Boolean(item.done),
                doneAt: item.doneAt || null
              };
            })

            if (data.settings) {
              settings = Object.assign(settings, data,settings);
            }
            saveItems();
            saveSettings();
            applyTheme();
            fillSettingsForm();
            renderList();
            renderDashboard();
            showToast("Imported " + items.length + " item(s) ✅", "good");
        } catch (error) {
            showToast("Import failed: " + error.message, "bad");
        }
    };
    reader.readAsText(file);

    event.target.value = "";
});

document.getElementById("clear-button").addEventListener("click", function() {
  openModal("Clear all data?", "Every task, event and setting stored in this browser will be erased.", function () {
    items = [];
    settings = { weeklyTarget: 15, weeklyCap: 40, name: "", theme: settings.theme };
    saveItems();
    saveSettings();
    fillSettingsForm();
    renderList();
    renderDashboard();
    showToast("All data cleared", "good");
  })
})

document.getElementById("sample-button").addEventListener("click", function () {
  loadSampleData();
  saveItems();
  renderList();
  renderDashboard();
  showToast("Sample data loaded 🌱", "good");
});

function daysFromToday(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function makeSample(title, type, days, hour, duration, priority, tags, notes, done) {
  return {
    id: Ids(),
    title: title,
    type: type,
    date: daysFromToday(days, hour),
    duration: duration,
    priority: priority,
    tags: tags,
    notes: notes,
    done: done,
    doneAt: done ? daysFromToday(days, hour + 1) : null
  };
}

function loadSampleData() {
  items = [
    makeSample("Calculus problem set 4", "task", 1, 18, 90, 3, ["math", "homework"], "chapters 5-6, show all working.", false),
    makeSample("CS lecture: Databases", "event", 0, 10, 60, 2, ["cs", "class"], "Room B204", false),
    makeSample("Read history chapter", "task", -1, 20, 45, 2, ["history", "reading"], "", true),
    makeSample("Group project meeting", "event", 2, 15, 120, 2, ["project", "team"], "Library pod 3", false),
    makeSample("Review stats notes", "task", -2, 16, 75, 1, ["stats", "exam"], "", true),
    makeSample("Essay draft - sociology", "task", 3, 22, 150, 3, ["sociology", "writing"], "1500 words", false),
    makeSample("Gym / basketball", "event", -1, 19, 60, 1, ["health"], "", false)
  ];
}

//Keyboard shortcuts

document.addEventListener("keydown", function (event) {

  if (event.key === Escape) {
    if(modal.classList.contains("show")) {
      closeModal();
    } else if (sidebar.classList.contains("open")) {
      closeMenu();
    } else if (document.getElementById("page-editor").classList.contains("active")) {
      resetForm();
      showPage("list");
    }
    return;
  }

  const typingIn = document.activeElement.tagName;
  if(typingIn === "INPUT" || typingIn === "TEXTAREA" || typingIn === "SELECT") {
    return;
  }

  if(event.key === "/") {
    event.preventDefault();
    showPage("list");
    searchInput.focus();
  }

  if (event.key === "n" || event.key === "N") {
    event.preventDefault();
    goToPage("editor");
    document.getElementById("item-title").focus();
  }
  
});

loadData();
if (items.length === 0) {
  loadSampleData();
}
applyTheme();
fillSettingsForm();
renderDashboard();