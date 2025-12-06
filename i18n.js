const translations = {
    en: {
        app_title: "GymTracker Pro",
        dashboard: "Dashboard",
        quick_actions: "Quick Actions",
        new_workout: "New Workout",
        free_training: "Free Training",
        recent_history: "Recent History",
        no_recent_workouts: "No recent workouts",
        start_workout: "Start Workout",
        select_plan: "Select a Plan",
        empty_workout: "Empty Workout",
        current_session: "Current Session",
        finish: "Finish",
        add_exercise: "Add Exercise",
        set: "Set",
        sets: "Sets",
        reps: "Reps",
        weight: "Weight",
        kg: "kg",
        confirm_finish: "Finish workout?",
        confirm_remove_set: "Remove set?",
        confirm_delete_plan: "Delete plan?",
        confirm_remove_exercise: "Remove exercise from plan?",
        plan_name: "Plan Name",
        exercise_name: "Exercise Name",
        my_plans: "My Plans",
        exercises: "Exercises", // For count
        library: "Library",
        workout_history: "Workout History",
        no_history_yet: "No history yet",
        vs_previous: "Vs Previous",
        distance: "Distance",
        steps: "Steps",
        terrain: "Terrain",
        notes: "Notes",
        video_url: "Video URL",
        watch_video: "Watch Video",
        save_changes: "Save Changes",
        vol: "Vol",
        max: "Max",
        was: "was",
        skipped: "Skipped",
        new_exercise: "New exercise",
        nav: {
            home: "Home",
            plans: "Plans",
            exercises: "Exercises",
            reports: "Reports"
        },
        actions: {
            add_note: "Add note",
            info: "Info",
            edit: "Edit",
            delete: "Delete",
            undo: "Undo",
            done: "Done",
            new: "New"
        },
        prompts: {
            add_note: "Add note for this execution:",
            enter_exercise_id: "Enter ID of exercise to add:"
        }
    },
    uk: {
        app_title: "GymTracker Pro",
        dashboard: "Дашборд",
        quick_actions: "Швидкі дії",
        new_workout: "Нове тренування",
        free_training: "Вільне тренування",
        recent_history: "Нещодавня історія",
        no_recent_workouts: "Немає нещодавніх тренувань",
        start_workout: "Почати тренування",
        select_plan: "Оберіть план",
        empty_workout: "Пусте тренування",
        current_session: "Поточна сесія",
        finish: "Завершити",
        add_exercise: "Додати вправу",
        set: "Підхід",
        sets: "Підходи",
        reps: "Повтори",
        weight: "Вага",
        kg: "кг",
        confirm_finish: "Завершити тренування?",
        confirm_remove_set: "Видалити підхід?",
        confirm_delete_plan: "Видалити план?",
        confirm_remove_exercise: "Видалити вправу з плану?",
        plan_name: "Назва плану",
        exercise_name: "Назва вправи",
        my_plans: "Мої плани",
        exercises: "Вправи",
        library: "Бібліотека",
        workout_history: "Історія тренувань",
        no_history_yet: "Історія порожня",
        vs_previous: "Проти попереднього",
        distance: "Відстань",
        steps: "Кроки",
        terrain: "Місцевість",
        notes: "Нотатки",
        video_url: "Посилання на відео",
        watch_video: "Дивитися відео",
        save_changes: "Зберегти зміни",
        vol: "Обсяг",
        max: "Макс",
        was: "було",
        skipped: "Пропущено",
        new_exercise: "Нова вправа",
        nav: {
            home: "Головна",
            plans: "Плани",
            exercises: "Вправи",
            reports: "Звіти"
        },
        actions: {
            add_note: "Додати нотатку",
            info: "Інфо",
            edit: "Редагувати",
            delete: "Видалити",
            undo: "Скасувати",
            done: "Готово",
            new: "Створити"
        },
        prompts: {
            add_note: "Додати нотатку для цього виконання:",
            enter_exercise_id: "Введіть ID вправи для додавання:"
        }
    },
    pl: {
        app_title: "GymTracker Pro",
        dashboard: "Panel",
        quick_actions: "Szybkie akcje",
        new_workout: "Nowy trening",
        free_training: "Wolny trening",
        recent_history: "Ostatnia historia",
        no_recent_workouts: "Brak ostatnich treningów",
        start_workout: "Rozpocznij trening",
        select_plan: "Wybierz plan",
        empty_workout: "Pusty trening",
        current_session: "Bieżąca sesja",
        finish: "Zakończ",
        add_exercise: "Dodaj ćwiczenie",
        set: "Seria",
        sets: "Serie",
        reps: "Powtórzenia",
        weight: "Ciężar",
        kg: "kg",
        confirm_finish: "Zakończyć trening?",
        confirm_remove_set: "Usunąć serię?",
        confirm_delete_plan: "Usunąć plan?",
        confirm_remove_exercise: "Usunąć ćwiczenie z planu?",
        plan_name: "Nazwa planu",
        exercise_name: "Nazwa ćwiczenia",
        my_plans: "Moje plany",
        exercises: "Ćwiczenia",
        library: "Biblioteka",
        workout_history: "Historia treningów",
        no_history_yet: "Brak historii",
        vs_previous: "Vs Poprzedni",
        distance: "Dystans",
        steps: "Kroki",
        terrain: "Teren",
        notes: "Notatki",
        video_url: "Link do wideo",
        watch_video: "Obejrzyj wideo",
        save_changes: "Zapisz zmiany",
        vol: "Obj",
        max: "Maks",
        was: "było",
        skipped: "Pominięto",
        new_exercise: "Nowe ćwiczenie",
        nav: {
            home: "Główna",
            plans: "Plany",
            exercises: "Ćwiczenia",
            reports: "Raporty"
        },
        actions: {
            add_note: "Dodaj notatkę",
            info: "Info",
            edit: "Edytuj",
            delete: "Usuń",
            undo: "Cofnij",
            done: "Gotowe",
            new: "Nowy"
        },
        prompts: {
            add_note: "Dodaj notatkę do tego wykonania:",
            enter_exercise_id: "Wprowadź ID ćwiczenia do dodania:"
        }
    }
};

let currentLang = localStorage.getItem('gymtracker_lang') || 'en';

function t(key, params = {}) {
    const keys = key.split('.');
    let val = translations[currentLang];
    for (const k of keys) {
        val = val ? val[k] : undefined;
    }

    if (val === undefined) {
        console.warn(`Missing translation for key: ${key} in language: ${currentLang}`);
        // Fallback to English
        val = translations['en'];
        for (const k of keys) {
            val = val ? val[k] : undefined;
        }
    }

    if (val === undefined) return key;

    for (const p in params) {
        val = val.replace(`{${p}}`, params[p]);
    }
    return val;
}

function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('gymtracker_lang', lang);
        document.documentElement.lang = lang;
        updateStaticContent();
        if (typeof app !== 'undefined' && app.init) {
            // Re-render current view if possible, or just reload
            location.reload();
        }
    }
}

function updateStaticContent() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = t(key);
    });
    // Also update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
}
