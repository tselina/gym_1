const app = {
    data: {
        exercises: [],
        plans: [],
        workouts: [],
        activeWorkout: null
    },

    init() {
        this.loadData();
        if (this.data.exercises.length === 0) {
            this.seedData();
        }
        this.renderDashboard();
        this.updateRecentHistory();
        window.addEventListener('hashchange', () => this.handleRouting());
    },

    loadData() {
        const saved = localStorage.getItem('gymtracker_data');
        if (saved) {
            this.data = JSON.parse(saved);
        }
    },

    saveData() {
        localStorage.setItem('gymtracker_data', JSON.stringify(this.data));
    },

    seedData() {
        this.data.exercises = [
            { id: 'ex1', name: 'Bench Press', type: 'gym', notes: 'Keep elbows tucked', video: '' },
            { id: 'ex2', name: 'Squat', type: 'gym', notes: 'Below parallel', video: '' },
            { id: 'ex3', name: 'Deadlift', type: 'gym', notes: 'Flat back', video: '' },
            { id: 'ex4', name: 'Pull Ups', type: 'gym', notes: 'Full ROM', video: '' },
            { id: 'run', name: 'Running', type: 'free', notes: '', video: '' }
        ];
        this.data.plans = [
            {
                id: 'p1',
                name: 'Full Body A',
                exercises: [
                    { id: 'ex1', sets: 3, reps: 10 },
                    { id: 'ex2', sets: 3, reps: 5 },
                    { id: 'ex4', sets: 3, reps: 'Failure' }
                ]
            }
        ];
        this.saveData();
    },

    navigate(viewId) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active', 'hidden'));
        document.querySelectorAll('.view').forEach(el => {
            if (el.id !== viewId + '-view') el.classList.add('hidden');
        });

        const target = document.getElementById(viewId + '-view');
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        if (viewId === 'dashboard') this.renderDashboard();
        if (viewId === 'plans') this.renderPlans();
        if (viewId === 'exercises') this.renderExercises();
        if (viewId === 'reports') this.renderReports();
    },

    // --- DASHBOARD ---
    renderDashboard() {
        const historyList = document.getElementById('recent-history-list');
        historyList.innerHTML = '';

        const recent = this.data.workouts.slice(-3).reverse();
        if (recent.length === 0) {
            historyList.innerHTML = `<div class="empty-state">${t('no_recent_workouts')}</div>`;
            return;
        }

        recent.forEach(w => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.style.cursor = 'pointer';
            el.onclick = () => app.viewWorkoutDetails(w.id);

            const date = new Date(w.startTime).toLocaleDateString(currentLang);
            el.innerHTML = `
                <div>
                    <div style="font-weight: 600">${this.escapeHtml(w.name || 'Workout')}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted)">${date}</div>
                </div>
                <div style="display:flex; align-items:center; gap: 10px">
                    <div>${w.exercises ? w.exercises.length : 0} ${t('exercises')}</div>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.8rem" onclick="event.stopPropagation(); app.reuseWorkout(${w.id})">↻</button>
                </div>
            `;
            historyList.appendChild(el);
        });
    },

    updateRecentHistory() {
        this.renderDashboard();
    },

    reuseWorkout(workoutId) {
        const past = this.data.workouts.find(w => w.id === workoutId);
        if (!past) return;

        // STRATEGY: "Reuse" means starting a valid new session but pre-filling it
        // with the exact weights and reps from the selected past session.
        // We clone the structure but reset 'completed' and 'finished' flags.
        // This helps users who want to repeat a specific performance or use it as a base.

        const newExercises = past.exercises.map(e => ({
            id: e.id,
            setsData: e.setsData.map(s => ({
                weight: s.weight,
                reps: s.reps,
                completed: false // Important: User must manually check them off again
            })),
            notes: e.notes || ''
        }));

        this.data.activeWorkout = {
            id: Date.now(),
            startTime: Date.now(),
            planId: past.planId,
            name: past.name,
            type: past.type,
            exercises: newExercises,
            finished: false,
            metrics: past.metrics ? { ...past.metrics } : undefined,
            notes: ''
        };

        this.saveData();
        this.renderActiveWorkout();
    },

    // --- WORKOUT LOGIC ---
    startWorkout() {
        const plansHtml = this.data.plans.map(p =>
            `<button class="btn action-card" onclick="app.initiateWorkout('${p.id}')">${this.escapeHtml(p.name)}</button>`
        ).join('');

        const content = `
            <div class="section-header">
                <h3>${t('select_plan')}</h3>
            </div>
            <div class="card-grid">
                ${plansHtml}
                <button class="btn action-card" onclick="app.initiateWorkout(null)">${t('empty_workout')}</button>
            </div>
        `;

        this.showModal(t('start_workout'), content);
    },

    startFreeTraining() {
        const activities = ['Walking', 'Running', 'Skiing', 'Skating', 'Cycling'];
        const html = activities.map(a =>
            `<button class="btn action-card" onclick="app.initiateFreeWorkout('${a}')">${a}</button>`
        ).join('');
        this.showModal(t('free_training'), `<div class="card-grid">${html}</div>`);
    },

    initiateFreeWorkout(activity) {
        this.data.activeWorkout = {
            id: Date.now(),
            startTime: Date.now(),
            name: activity,
            type: 'free',
            notes: '',
            metrics: { distance: 0, duration: 0, steps: 0 }
        };
        this.saveData();
        this.closeModal();
        this.renderActiveWorkout();
    },

    initiateWorkout(planId) {
        let planExercises = [];
        let name = "Custom Workout";

        if (planId) {
            const plan = this.data.plans.find(p => p.id === planId);
            if (plan) {
                name = plan.name;
                // SMART DEFAULTS LOGIC:
                // When starting a Plan, we look for the *last execution* of this specific plan.
                // If found, we pre-fill the new workout's sets with the weights/reps used previously.
                // This implements "Progressive Overload" tracking simply by showing what you did last time.
                const lastWorkout = this.data.workouts.slice().reverse().find(w => w.planId === planId);

                planExercises = plan.exercises.map(e => {
                    let initialSets = [];
                    if (lastWorkout) {
                        // Match exercise in history by ID
                        const pastEx = lastWorkout.exercises.find(pe => pe.id === e.id);
                        if (pastEx && pastEx.setsData && pastEx.setsData.length > 0) {
                            // Copy historical data as starting values
                            initialSets = pastEx.setsData.map(s => ({
                                weight: s.weight,
                                reps: s.reps,
                                completed: false
                            }));
                        }
                    }

                    // FALLBACK: If no history exists, use the Plan's default targets (set in Plan Editor)
                    if (initialSets.length === 0) {
                        const count = e.sets || 3;
                        for (let i = 0; i < count; i++) {
                            initialSets.push({
                                weight: '',
                                reps: e.reps || '',
                                completed: false
                            });
                        }
                    }

                    return { ...e, setsData: initialSets };
                });
            }
        }

        this.data.activeWorkout = {
            id: Date.now(),
            startTime: Date.now(),
            planId: planId,
            name: name,
            type: 'gym',
            exercises: planExercises,
            finished: false
        };
        this.saveData();
        this.closeModal();
        this.renderActiveWorkout();
    },

    renderActiveWorkout() {
        this.navigate('workout');
        const view = document.getElementById('workout-view');
        view.classList.remove('hidden');
        view.classList.add('active');

        document.querySelectorAll('.view').forEach(el => {
            if (el.id !== 'workout-view') el.classList.add('hidden');
        });

        const w = this.data.activeWorkout;
        if (!w) {
            view.innerHTML = `<div class="empty-state">${t('no_active_workout', 'No active workout')}</div>`;
            return;
        }

        if (w.type === 'free') {
            this.renderFreeWorkout(view, w);
            return;
        }

        view.innerHTML = `
            <div class="section-header">
                <h3>${t('current_session')}</h3>
                <button class="btn" style="color: var(--danger)" onclick="app.finishWorkout()">${t('finish')}</button>
            </div>
            <h2>${this.escapeHtml(w.name)}</h2>
            <div id="workout-exercises-list" class="list-container" style="margin-top: 20px;"></div>
            
            <div style="margin-top: 20px; text-align: center;">
             <button class="btn" onclick="app.addExerciseToWorkout()">+ ${t('add_exercise')}</button>
            </div>
        `;

        const list = document.getElementById('workout-exercises-list');
        w.exercises.forEach((ex, idx) => {
            const ref = this.data.exercises.find(e => e.id === ex.id);
            const el = document.createElement('div');
            el.className = 'list-item';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'stretch';

            let setsHtml = '';
            const setsData = ex.setsData || [];

            setsData.forEach((s, sIdx) => {
                setsHtml += `
                    <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
                        <span style="width: 20px; color: var(--text-muted); font-size:0.8rem">${sIdx + 1}</span>
                        <input type="number" value="${s.weight}" placeholder="${t('kg')}" style="width: 60px; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-main)" onchange="app.updateSet(${idx}, ${sIdx}, 'weight', this.value)">
                        <input type="number" value="${s.reps}" placeholder="${t('reps')}" style="width: 60px; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-main)" onchange="app.updateSet(${idx}, ${sIdx}, 'reps', this.value)">
                        <input type="checkbox" style="width: 24px; height: 24px" ${s.completed ? 'checked' : ''} onchange="app.toggleSetComplete(${idx}, ${sIdx})">
                        <button class="btn" style="padding: 4px 8px; color: var(--danger)" onclick="app.removeSet(${idx}, ${sIdx})">×</button>
                    </div>
                `;
            });

            setsHtml += `
                <div style="margin-top: 12px; text-align: right;">
                    <button class="btn" style="padding: 4px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.05)" onclick="app.addSet(${idx})">+ ${t('set')}</button>
                </div>
            `;

            el.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: flex-start;">
                    <div>
                        <strong>${this.escapeHtml(ref ? ref.name : 'Unknown')}</strong>
                        ${(ex.sets || ex.reps) ? `<div style="font-size: 0.8rem; color: var(--secondary); margin-top: 2px;">Target: ${ex.sets || '?'} x ${ex.reps || '?'}</div>` : ''}
                        ${ref && ref.notes ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">ℹ️ ${this.escapeHtml(ref.notes)}</div>` : ''}
                    </div>
                    <div style="display:flex; gap: 8px">
                        <button class="btn" style="padding: 4px 8px; font-size: 0.8rem" onclick="app.addExerciseNote(${idx})">📝</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.8rem" onclick="app.showExerciseInfo('${ex.id}')">⚙️</button>
                    </div>
                </div>
                ${ex.notes ? `<div style="font-size: 0.85rem; color: var(--primary); margin-bottom: 10px; font-style: italic; border-left: 2px solid var(--primary); padding-left: 8px;">"${this.escapeHtml(ex.notes)}"</div>` : ''}
                <div>${setsHtml}</div>
            `;
            list.appendChild(el);
        });
    },

    addExerciseNote(idx) {
        if (!this.data.activeWorkout) return;
        const ex = this.data.activeWorkout.exercises[idx];
        const note = prompt(t('prompts.add_note'), ex.notes || "");
        if (note !== null) {
            ex.notes = note;
            this.saveData();
            this.renderActiveWorkout();
        }
    },

    renderFreeWorkout(view, w) {
        view.innerHTML = `
             <div class="section-header">
                <h3>${t('free_training')}</h3>
                <button class="btn" style="color: var(--danger)" onclick="app.finishWorkout()">${t('finish')}</button>
            </div>
            <h2>${this.escapeHtml(w.name)}</h2>
            
            <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label>${t('distance')} (km)</label>
                    <input type="number" step="0.1" value="${w.metrics.distance || ''}" onchange="app.updateFreeMetric('distance', this.value)">
                </div>
                 <div>
                    <label>${t('steps')}</label>
                    <input type="number" value="${w.metrics.steps || ''}" onchange="app.updateFreeMetric('steps', this.value)">
                </div>
                 <div>
                    <label>${t('terrain')}</label>
                    <input type="text" placeholder="${t('terrain')}" value="${this.escapeHtml(w.metrics.terrain || '')}" onchange="app.updateFreeMetric('terrain', this.value)">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 8px">${t('notes')}</label>
                    <textarea rows="4" onchange="app.updateFreeMetric('notes', this.value)">${this.escapeHtml(w.notes || '')}</textarea>
                </div>
            </div>
        `;
    },

    updateFreeMetric(key, val) {
        if (!this.data.activeWorkout) return;
        if (key === 'notes') {
            this.data.activeWorkout.notes = val;
        } else {
            this.data.activeWorkout.metrics[key] = val;
        }
        this.saveData();
    },

    updateSet(exIdx, setIdx, field, val) {
        if (!this.data.activeWorkout) return;
        this.data.activeWorkout.exercises[exIdx].setsData[setIdx][field] = val;
        this.saveData();
    },

    toggleSetComplete(exIdx, setIdx) {
        if (!this.data.activeWorkout) return;
        const set = this.data.activeWorkout.exercises[exIdx].setsData[setIdx];
        set.completed = !set.completed;
        this.saveData();
    },

    addSet(exIdx) {
        if (!this.data.activeWorkout) return;
        const ex = this.data.activeWorkout.exercises[exIdx];
        const lastSet = ex.setsData.length > 0 ? ex.setsData[ex.setsData.length - 1] : null;
        ex.setsData.push({
            weight: lastSet ? lastSet.weight : '',
            reps: lastSet ? lastSet.reps : '',
            completed: false
        });
        this.saveData();
        this.renderActiveWorkout();
    },

    removeSet(exIdx, setIdx) {
        if (!this.data.activeWorkout) return;
        if (!confirm(t('confirm_remove_set'))) return;

        const ex = this.data.activeWorkout.exercises[exIdx];
        const removed = ex.setsData[setIdx];

        ex.setsData.splice(setIdx, 1);
        this.saveData();
        this.renderActiveWorkout();

        this.showUndoToast('Set removed', () => {
            if (this.data.activeWorkout && this.data.activeWorkout.exercises[exIdx]) {
                this.data.activeWorkout.exercises[exIdx].setsData.splice(setIdx, 0, removed);
                this.saveData();
                this.renderActiveWorkout();
            }
        });
    },

    finishWorkout() {
        if (!confirm(t('confirm_finish'))) return;

        const w = this.data.activeWorkout;
        w.endTime = Date.now();
        w.finished = true;

        this.data.workouts.push(w);
        this.data.activeWorkout = null;
        this.saveData();

        this.navigate('dashboard');
    },

    addExerciseToWorkout() {
        const list = this.data.exercises.map(e => `${e.id}: ${e.name}`).join('\n');
        const id = prompt(`${t('prompts.enter_exercise_id')}\n${list}`);
        if (id) {
            const ex = this.data.exercises.find(e => e.id === id || e.name === id);
            if (ex) {
                this.data.activeWorkout.exercises.push({
                    id: ex.id,
                    setsData: []
                });
                this.saveData();
                this.renderActiveWorkout();
            }
        }
    },

    // --- PLANS & EXERCISES ---
    renderPlans() {
        const view = document.getElementById('plans-view');
        view.innerHTML = `
             <div class="section-header">
                <h3>${t('my_plans')}</h3>
                <button class="btn btn-primary" onclick="app.createPlan()">+ ${t('actions.new')}</button>
            </div>
            <div class="list-container">
                ${this.data.plans.map(p => `
                    <div class="list-item">
                        <div>
                            <strong>${this.escapeHtml(p.name)}</strong>
                            <div style="font-size: 0.8rem; color: var(--text-muted)">${p.exercises.length} ${t('exercises')}</div>
                        </div>
                        <div style="display:flex; gap: 8px">
                             <button class="btn" style="padding: 4px 8px" onclick="app.renderPlanEditor('${p.id}')">✏️</button>
                             <button class="btn" style="padding: 4px 8px" onclick="app.deletePlan('${p.id}')">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    createPlan() {
        const name = prompt(t('plan_name'));
        if (name) {
            this.data.plans.push({
                id: 'p-' + Date.now(),
                name: name,
                exercises: []
            });
            this.saveData();
            this.renderPlans();
        }
    },

    deletePlan(id) {
        if (!confirm(t('confirm_delete_plan'))) return;

        const planIdx = this.data.plans.findIndex(p => p.id === id);
        if (planIdx === -1) return;

        const plan = this.data.plans[planIdx];
        this.data.plans.splice(planIdx, 1);
        this.saveData();
        this.renderPlans();

        this.showUndoToast('Plan deleted', () => {
            this.data.plans.splice(planIdx, 0, plan);
            this.saveData();
            this.renderPlans();
        });
    },

    renderPlanEditor(planId) {
        const plan = this.data.plans.find(p => p.id === planId);
        if (!plan) return;

        const view = document.getElementById('plans-view');
        view.innerHTML = `
            <div class="section-header">
                <h3>${t('actions.edit')}: ${this.escapeHtml(plan.name)}</h3>
                <button class="btn" onclick="app.renderPlans()">${t('actions.done')}</button>
            </div>
            <div class="list-container">
                ${plan.exercises.map((e, idx) => {
            const ref = this.data.exercises.find(x => x.id === e.id);
            return `
                    <div class="list-item" style="flex-direction: column; align-items: stretch;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 8px">
                            <strong>${this.escapeHtml(ref ? ref.name : e.id)}</strong>
                            <button class="btn" style="padding:2px 8px; color:var(--danger)" onclick="app.removeExerciseFromPlan('${planId}', ${idx})">×</button>
                        </div>
                        <div style="display:flex; gap: 10px;">
                            <div style="flex:1">
                                <label style="font-size:0.7rem; color:var(--text-muted)">Sets</label>
                                <input type="number" value="${e.sets || ''}" style="padding: 6px" onchange="app.updatePlanExercise('${planId}', ${idx}, 'sets', this.value)">
                            </div>
                            <div style="flex:1">
                                <label style="font-size:0.7rem; color:var(--text-muted)">Reps</label>
                                <input type="number" value="${e.reps || ''}" style="padding: 6px" onchange="app.updatePlanExercise('${planId}', ${idx}, 'reps', this.value)">
                            </div>
                        </div>
                    </div>
                    `;
        }).join('')}
                
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn btn-primary" onclick="app.addExerciseToPlan('${planId}')">+ ${t('add_exercise')}</button>
                </div>
            </div>
        `;
    },

    updatePlanExercise(planId, idx, field, val) {
        const plan = this.data.plans.find(p => p.id === planId);
        if (plan) {
            plan.exercises[idx][field] = val;
            this.saveData();
        }
    },

    updateHistorySet(workoutId, exIdx, setIdx, field, val) {
        const w = this.data.workouts.find(x => x.id === workoutId);
        if (w && w.exercises[exIdx] && w.exercises[exIdx].setsData[setIdx]) {
            w.exercises[exIdx].setsData[setIdx][field] = val;
            this.saveData();
        }
    },

    removeExerciseFromPlan(planId, idx) {
        if (!confirm(t('confirm_remove_exercise'))) return;

        const plan = this.data.plans.find(p => p.id === planId);
        if (plan) {
            const removed = plan.exercises[idx];
            plan.exercises.splice(idx, 1);
            this.saveData();
            this.renderPlanEditor(planId);

            this.showUndoToast('Exercise removed', () => {
                const p = this.data.plans.find(x => x.id === planId);
                if (p) {
                    p.exercises.splice(idx, 0, removed);
                    this.saveData();
                    if (document.getElementById('plans-view').innerHTML.includes(this.escapeHtml(p.name))) {
                        this.renderPlanEditor(planId);
                    }
                }
            });
        }
    },

    addExerciseToPlan(planId) {
        const list = this.data.exercises.map(e => `${e.id}: ${e.name}`).join('\n');
        const id = prompt(`${t('prompts.enter_exercise_id')}\n${list}`);
        if (id) {
            const plan = this.data.plans.find(p => p.id === planId);
            const ref = this.data.exercises.find(e => e.id === id || e.name === id);
            if (plan && ref) {
                plan.exercises.push({ id: ref.id, sets: 3, reps: 10 });
                this.saveData();
                this.renderPlanEditor(planId);
            }
        }
    },

    renderExercises() {
        const view = document.getElementById('exercises-view');
        view.innerHTML = `
             <div class="section-header">
                <h3>${t('library')}</h3>
                <button class="btn btn-primary" onclick="app.createExercise()">+ ${t('actions.new')}</button>
            </div>
            <div class="list-container">
                ${this.data.exercises.map(e => `
                    <div class="list-item" onclick="app.showExerciseInfo('${e.id}')">
                        <div>
                            <strong>${this.escapeHtml(e.name)}</strong>
                            <div style="font-size: 0.8rem; color: var(--text-muted)">${e.type}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    createExercise() {
        const name = prompt(t('exercise_name'));
        if (name) {
            this.data.exercises.push({
                id: 'ex-' + Date.now(),
                name: name,
                type: 'gym',
                notes: '',
                video: ''
            });
            this.saveData();
            this.renderExercises();
        }
    },

    showExerciseInfo(id) {
        const ex = this.data.exercises.find(e => e.id === id);
        if (!ex) return;

        const content = `
            <div>
                <label>${t('notes')}</label>
                <textarea rows="3" id="edit-notes">${this.escapeHtml(ex.notes || '')}</textarea>
                
                <label style="margin-top: 10px; display:block">${t('video_url')}</label>
                <input type="text" id="edit-video" value="${this.escapeHtml(ex.video || '')}">
                
                ${ex.video ? `<a href="${this.escapeHtml(ex.video)}" target="_blank" style="display:block; margin-top:10px; color: var(--primary)">${t('watch_video')}</a>` : ''}
                
                <button class="btn btn-primary" style="margin-top: 20px; width: 100%" onclick="app.saveExerciseInfo('${id}')">${t('save_changes')}</button>
            </div>
        `;
        this.showModal(this.escapeHtml(ex.name), content);
    },

    saveExerciseInfo(id) {
        const ex = this.data.exercises.find(e => e.id === id);
        if (ex) {
            ex.notes = document.getElementById('edit-notes').value;
            ex.video = document.getElementById('edit-video').value;
            this.saveData();
            this.closeModal();
            this.renderExercises();
        }
    },

    // --- REPORTS ---
    renderReports() {
        const view = document.getElementById('reports-view');

        const historyHtml = this.data.workouts.slice().reverse().map(w => {
            const date = new Date(w.startTime).toLocaleString(currentLang, {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            let summary = '';
            if (w.type === 'free') {
                summary = `<span>${w.metrics.distance || 0} km</span> • <span>${w.metrics.steps || 0} ${t('steps')}</span>`;
            } else {
                const totalSets = w.exercises.reduce((acc, ex) => acc + (ex.setsData ? ex.setsData.length : 0), 0);
                summary = `<span>${w.exercises.length} ${t('exercises')}</span> • <span>${totalSets} ${t('sets')}</span>`;
            }

            return `
                <div class="list-item" style="display:block; cursor: pointer" onclick="app.viewWorkoutDetails(${w.id})">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <strong>${this.escapeHtml(w.name)}</strong>
                        <span style="color: var(--text-muted); font-size: 0.8rem">${date}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-muted); display: flex; gap: 10px;">
                        ${summary}
                    </div>
                </div>
            `;
        }).join('');

        view.innerHTML = `
            <div class="section-header">
                <h3>${t('workout_history')}</h3>
            </div>
            <div class="list-container">
                ${historyHtml || `<div class="empty-state">${t('no_history_yet')}</div>`}
            </div>
        `;
    },

    viewWorkoutDetails(workoutId) {
        const w = this.data.workouts.find(x => x.id === workoutId);
        if (!w) return;

        // 1. GENERATE TEXT REPORT
        const date = new Date(w.startTime);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const dateStr = `${day}.${month}.${year}`;

        let reportText = `${dateStr} ${w.name}\n\n`;

        // Sort exercises
        let sortedExercises = w.exercises.map((e, i) => ({ ...e, _origIdx: i }));
        if (w.planId) {
            const plan = this.data.plans.find(p => p.id === w.planId);
            if (plan) {
                const planOrder = plan.exercises.map(e => e.id);
                sortedExercises.sort((a, b) => {
                    const idxA = planOrder.indexOf(a.id);
                    const idxB = planOrder.indexOf(b.id);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });
            }
        }

        sortedExercises.forEach(ex => {
            const ref = this.data.exercises.find(e => e.id === ex.id);
            const name = ref ? ref.name : 'Unknown';
            const sets = ex.setsData || [];

            // Compression Logic
            let compressed = '';
            // Only consider completed sets or all sets? User said "report", usually performed sets. But keeping all for now.
            if (sets.length > 0) {
                const weights = sets.map(s => s.weight);
                const uniqueWeights = [...new Set(weights)];

                if (uniqueWeights.length === 1) {
                    // Case 1: Same weight
                    const reps = sets.map(s => s.reps).join(', ');
                    compressed = `${uniqueWeights[0]} ${reps}`;
                } else {
                    // Case 2: Mixed weights
                    compressed = sets.map(s => `${s.weight} ${s.reps}`).join('; ');
                }
            } else {
                compressed = t('skipped');
            }

            reportText += `${name}. ${compressed}\n`;
        });

        // 2. COMPARISON SECTION
        let comparisonHtml = '';
        let graphHtml = '';

        if (w.planId) {
            const history = this.data.workouts
                .filter(x => x.planId === w.planId)
                .sort((a, b) => a.startTime - b.startTime);

            const currentIndex = history.findIndex(x => x.id === w.id);
            const prevW = currentIndex > 0 ? history[currentIndex - 1] : null;

            if (prevW) {
                const prevDate = new Date(prevW.startTime).toLocaleDateString(currentLang);
                comparisonHtml += `<div style="margin-bottom: 8px; font-weight: bold; color: var(--secondary); margin-top:20px;">${t('vs_previous')} (${prevDate})</div>`;

                sortedExercises.forEach(ex => {
                    const ref = this.data.exercises.find(e => e.id === ex.id);
                    const prevEx = prevW.exercises.find(e => e.id === ex.id);

                    let diffHtml = '';
                    if (prevEx) {
                        const volCur = (ex.setsData || []).reduce((a, s) => a + (Number(s.weight || 0) * Number(s.reps || 0)), 0);
                        const volPrev = (prevEx.setsData || []).reduce((a, s) => a + (Number(s.weight || 0) * Number(s.reps || 0)), 0);
                        const diff = volCur - volPrev;
                        const diffColor = diff > 0 ? 'var(--success)' : (diff < 0 ? 'var(--danger)' : 'var(--text-muted)');
                        const diffSign = diff > 0 ? '+' : '';

                        const maxCur = Math.max(...(ex.setsData || []).map(s => Number(s.weight || 0)), 0);
                        const maxPrev = Math.max(...(prevEx.setsData || []).map(s => Number(s.weight || 0)), 0);

                        diffHtml = `
                              <div style="font-size: 0.8rem; color: var(--text-muted)">
                                ${t('vol')}: <strong>${volCur}</strong> <span style="color:${diffColor}">(${diffSign}${diff})</span> | 
                                ${t('max')}: <strong>${maxCur}</strong> (${t('was')} ${maxPrev})
                              </div>
                           `;
                    } else {
                        diffHtml = `<div style="font-size: 0.8rem; color: var(--text-muted);">${t('new_exercise')}</div>`;
                    }

                    comparisonHtml += `
                       <div style="margin-bottom: 8px; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
                           <div style="font-weight: 600; font-size: 0.9rem">${this.escapeHtml(ref ? ref.name : 'Unknown')}</div>
                           ${diffHtml}
                       </div>
                   `;
                });
            } else {
                comparisonHtml = '<div style="font-size:0.8rem; font-style:italic; margin-top:20px;">No previous workout to compare.</div>';
            }

            // 3. GRAPH SECTION
            graphHtml += `<div style="margin-bottom: 8px; font-weight: bold; color: var(--secondary); margin-top: 24px;">Volume Progression</div>`;
            graphHtml += `<div style="display: flex; align-items: flex-end; height: 100px; gap: 4px; padding-top: 10px; overflow-x: auto;">`;

            const recentHistory = history.slice(-15); // Show last 15
            const volumes = recentHistory.map(h => {
                return h.exercises.reduce((acc, e) => acc + (e.setsData || []).reduce((a, s) => a + (Number(s.weight || 0) * Number(s.reps || 0)), 0), 0);
            });
            const maxVol = Math.max(...volumes, 1);

            recentHistory.forEach((h, i) => {
                const vol = volumes[i];
                const height = (vol / maxVol) * 100;
                const isCurrent = h.id === w.id;
                const dateObj = new Date(h.startTime);
                const dateShort = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                graphHtml += `
                    <div style="display:flex; flex-direction: column; align-items: center; min-width: 30px; flex: 1;">
                        <div style="font-size: 0.6rem; color: var(--text-muted); writing-mode: vertical-rl; transform: rotate(180deg); margin-bottom: 2px;">${vol > 0 ? vol : ''}</div>
                        <div style="width: 100%; background: ${isCurrent ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; height: ${Math.max(height, 5)}%; border-radius: 4px 4px 0 0;" title="${dateShort}: ${vol}"></div>
                        <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: 4px">${dateShort}</div>
                    </div>
                `;
            });
            graphHtml += `</div>`;
        }

        const viewContent = `
            <div style="max-height: 80vh; overflow-y: auto;">
                <label style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Copyable Report</label>
                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: var(--radius-md); font-family: monospace; font-size: 0.9rem; white-space: pre-wrap; border: 1px solid var(--border); margin-bottom: 12px; user-select: all;" id="report-text-area">${this.escapeHtml(reportText)}</div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 24px;">
                    <button class="btn btn-primary" onclick="app.copyReport()" style="flex:1">📋 Copy</button>
                    <button class="btn" onclick="app.editWorkoutDetails(${w.id})" style="flex:1">✏️ Edit</button>
                </div>
                
                <div style="background: var(--bg-surface); padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
                    ${comparisonHtml}
                    ${graphHtml}
                </div>
            </div>
        `;

        this.showModal(this.escapeHtml(w.name), viewContent);
    },

    copyReport() {
        const text = document.getElementById('report-text-area').innerText;
        navigator.clipboard.writeText(text).then(() => {
            this.showUndoToast('Copied to clipboard!', () => { });
        });
    },

    editWorkoutDetails(workoutId) {
        const w = this.data.workouts.find(x => x.id === workoutId);
        if (!w) return;

        // SORTING LOGIC: same as before
        let sortedExercises = w.exercises.map((e, i) => ({ ...e, _origIdx: i }));

        if (w.planId) {
            const plan = this.data.plans.find(p => p.id === w.planId);
            if (plan) {
                const planOrder = plan.exercises.map(e => e.id);
                sortedExercises.sort((a, b) => {
                    const idxA = planOrder.indexOf(a.id);
                    const idxB = planOrder.indexOf(b.id);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });
            }
        }

        const detailsHtml = sortedExercises.map(ex => {
            const ref = this.data.exercises.find(e => e.id === ex.id);
            const sets = ex.setsData || [];

            return `
                <div style="margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <strong style="color: var(--primary)">${this.escapeHtml(ref ? ref.name : 'Unknown Exercise')}</strong>
                    </div>
                    ${ex.notes ? `<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; font-style: italic;">"${this.escapeHtml(ex.notes)}"</div>` : ''}
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${sets.map((s, sIdx) => `
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span style="width: 20px; color: var(--text-muted); font-size: 0.8rem">${sIdx + 1}</span>
                                <input type="number" value="${s.weight}" style="width: 70px; padding: 6px" onchange="app.updateHistorySet(${w.id}, ${ex._origIdx}, ${sIdx}, 'weight', this.value)">
                                <span style="font-size: 0.8rem; color: var(--text-muted)">kg</span>
                                <input type="number" value="${s.reps}" style="width: 70px; padding: 6px" onchange="app.updateHistorySet(${w.id}, ${ex._origIdx}, ${sIdx}, 'reps', this.value)">
                                <span style="font-size: 0.8rem; color: var(--text-muted)">reps</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        const freeDetails = w.type === 'free' ? `
            <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 20px;">
                <div class="action-card" style="cursor: default; align-items: flex-start;">
                    <div style="font-size: 0.8rem; color: var(--text-muted)">Distance (km)</div>
                    <input type="number" step="0.1" value="${w.metrics.distance}" onchange="app.updateHistoryMetric(${w.id}, 'distance', this.value)">
                </div>
                <div class="action-card" style="cursor: default; align-items: flex-start;">
                    <div style="font-size: 0.8rem; color: var(--text-muted)">Steps</div>
                     <input type="number" value="${w.metrics.steps || 0}" onchange="app.updateHistoryMetric(${w.id}, 'steps', this.value)">
                </div>
                 <div class="action-card" style="cursor: default; align-items: flex-start;">
                     <div style="font-size: 0.8rem; color: var(--text-muted)">Notes</div>
                     <textarea rows="3" onchange="app.updateHistoryMetric(${w.id}, 'notes', this.value)">${this.escapeHtml(w.notes || '')}</textarea>
                </div>
            </div>
        ` : '';

        const content = `
            <div style="max-height: 70vh; overflow-y: auto;">
                <button class="btn" style="margin-bottom:10px" onclick="app.viewWorkoutDetails(${w.id})">← Back to Report</button>
                ${w.type === 'free' ? freeDetails : detailsHtml}
            </div>
        `;

        this.showModal(`Editing: ${this.escapeHtml(w.name)}`, content);
    },

    updateHistoryMetric(workoutId, key, val) {
        const w = this.data.workouts.find(x => x.id === workoutId);
        if (w) {
            if (key === 'notes') w.notes = val;
            else w.metrics[key] = val;
            this.saveData();
        }
    },

    // --- UTILS ---

    // SECURITY: XSS SANITIZATION
    // Since we use innerHTML to render views (Virtual DOM-lite approach), we MUST sanitize
    // any user-generated content (names, notes) to prevent Cross-Site Scripting attacks.
    // This replaces special characters with HTML entities.
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    showModal(title, content) {
        let modal = document.getElementById('modal-overlay');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-overlay';
            modal.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000;
                display: flex; align-items: center; justify-content: center; padding: 20px;
                backdrop-filter: blur(5px);
            `;
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background: var(--bg-surface); padding: 20px; border-radius: var(--radius-lg); width: 100%; max-width: 400px; border: 1px solid var(--border)">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h2>${title}</h2>
                    <button class="btn" style="background:none; font-size: 1.5rem" onclick="app.closeModal()">×</button>
                </div>
                <div>${content}</div>
            </div>
        `;
        modal.classList.remove('hidden');
    },

    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) modal.remove();
    },

    // UI: UNDO NOTIFICATION
    // For destructive actions (delete), we offer a minimal "Toast" notification with an Undo button.
    // This allows us to keep the UI clean (no confirmation modal for every small action if we chose purely undo, 
    // though currently we use Confirm + Undo for maximum safety as requested).
    showUndoToast(msg, onUndo) {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerHTML = `
            <span>${msg}</span>
            <button class="btn" style="padding: 4px 8px; font-size: 0.8rem; background: var(--bg-body)">Undo</button>
        `;

        let timeout;

        const undoBtn = el.querySelector('button');
        undoBtn.onclick = () => {
            onUndo();
            el.remove();
            clearTimeout(timeout);
        };

        container.appendChild(el);

        timeout = setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 15000);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
