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
        // specific nav item highlight logic could go here

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
            historyList.innerHTML = '<div class="empty-state">No recent workouts</div>';
            return;
        }

        recent.forEach(w => {
            const el = document.createElement('div');
            el.className = 'list-item';
            const date = new Date(w.startTime).toLocaleDateString();
            el.innerHTML = `
                <div>
                    <div style="font-weight: 600">${w.name || 'Workout'}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted)">${date}</div>
                </div>
                <div style="display:flex; align-items:center; gap: 10px">
                    <div>${w.exercises ? w.exercises.length : 0} Ex</div>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.8rem" onclick="app.reuseWorkout(${w.id})">↻</button>
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

        // If it was based on a plan, use that plan to get the structure, but implies "Reuse" might mean "Retry same stats"?
        // "conditions from point 3": use default values ... from previous same type workout.
        // Reusing a workout IS the previous same type workout.
        // So we can just clone the exercises and their sets as "pending".

        const newExercises = past.exercises.map(e => ({
            id: e.id,
            setsData: e.setsData.map(s => ({
                weight: s.weight,
                reps: s.reps,
                completed: false // Reset completion
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
            notes: '' // Reset main notes? Or keep? Usually reset.
        };

        this.saveData();
        this.renderActiveWorkout();
    },

    // --- WORKOUT LOGIC ---
    startWorkout() {
        // Show plan selection modal or screen
        const plansHtml = this.data.plans.map(p =>
            `<button class="btn action-card" onclick="app.initiateWorkout('${p.id}')">${p.name}</button>`
        ).join('');

        const content = `
            <div class="section-header">
                <h3>Select a Plan</h3>
            </div>
            <div class="card-grid">
                ${plansHtml}
                <button class="btn action-card" onclick="app.initiateWorkout(null)">Empty Workout</button>
            </div>
        `;

        this.showModal('Start Workout', content);
    },

    startFreeTraining() {
        // For walking, skiing, etc
        const activities = ['Walking', 'Running', 'Skiing', 'Skating', 'Cycling'];
        const html = activities.map(a =>
            `<button class="btn action-card" onclick="app.initiateFreeWorkout('${a}')">${a}</button>`
        ).join('');
        this.showModal('Free Training', `<div class="card-grid">${html}</div>`);
    },

    initiateFreeWorkout(activity) {
        this.data.activeWorkout = {
            id: Date.now(),
            startTime: Date.now(),
            name: activity,
            type: 'free',
            notes: '',
            metrics: { distance: 0, duration: 0, steps: 0 } // placeholder
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

                // Find last workout with this plan
                const lastWorkout = this.data.workouts.slice().reverse().find(w => w.planId === planId);

                planExercises = plan.exercises.map(e => {
                    let initialSets = [];

                    if (lastWorkout) {
                        const pastEx = lastWorkout.exercises.find(pe => pe.id === e.id);
                        if (pastEx && pastEx.setsData && pastEx.setsData.length > 0) {
                            // Use previous weights/reps
                            initialSets = pastEx.setsData.map(s => ({
                                weight: s.weight,
                                reps: s.reps,
                                completed: false
                            }));
                        }
                    }

                    // Fallback to plan defaults if no history
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

                    return {
                        ...e,
                        setsData: initialSets
                    };
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
        this.navigate('workout'); // We need to ensure a workout view exists or hijack one
        const view = document.getElementById('workout-view');
        view.classList.remove('hidden');
        view.classList.add('active');

        // Hide others manually if needed or modify navigate
        document.querySelectorAll('.view').forEach(el => {
            if (el.id !== 'workout-view') el.classList.add('hidden');
        });

        const w = this.data.activeWorkout;
        if (!w) {
            view.innerHTML = '<div class="empty-state">No active workout</div>';
            return;
        }

        if (w.type === 'free') {
            this.renderFreeWorkout(view, w);
            return;
        }

        view.innerHTML = `
            <div class="section-header">
                <h3>Current Session</h3>
                <button class="btn" style="color: var(--danger)" onclick="app.finishWorkout()">Finish</button>
            </div>
            <h2>${w.name}</h2>
            <div id="workout-exercises-list" class="list-container" style="margin-top: 20px;"></div>
            
            <div style="margin-top: 20px; text-align: center;">
             <button class="btn" onclick="app.addExerciseToWorkout()">+ Add Exercise</button>
            </div>
        `;

        const list = document.getElementById('workout-exercises-list');
        w.exercises.forEach((ex, idx) => {
            const ref = this.data.exercises.find(e => e.id === ex.id);
            const el = document.createElement('div');
            el.className = 'list-item';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'stretch';

            // Render sets as inputs
            let setsHtml = '';
            const setsData = ex.setsData || [];

            setsData.forEach((s, sIdx) => {
                setsHtml += `
                    <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
                        <span style="width: 20px; color: var(--text-muted); font-size:0.8rem">${sIdx + 1}</span>
                        <input type="number" value="${s.weight}" placeholder="kg" style="width: 60px; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-main)" onchange="app.updateSet(${idx}, ${sIdx}, 'weight', this.value)">
                        <input type="number" value="${s.reps}" placeholder="reps" style="width: 60px; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-main)" onchange="app.updateSet(${idx}, ${sIdx}, 'reps', this.value)">
                        <input type="checkbox" style="width: 24px; height: 24px" ${s.completed ? 'checked' : ''} onchange="app.toggleSetComplete(${idx}, ${sIdx})">
                        <button class="btn" style="padding: 4px 8px; color: var(--danger)" onclick="app.removeSet(${idx}, ${sIdx})">×</button>
                    </div>
                `;
            });

            // Add Set Button
            setsHtml += `
                <div style="margin-top: 12px; text-align: right;">
                    <button class="btn" style="padding: 4px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.05)" onclick="app.addSet(${idx})">+ Set</button>
                </div>
            `;

            el.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: flex-start;">
                    <div>
                        <strong>${ref ? ref.name : 'Unknown'}</strong>
                        ${(ex.sets || ex.reps) ? `<div style="font-size: 0.8rem; color: var(--secondary); margin-top: 2px;">Target: ${ex.sets || '?'} x ${ex.reps || '?'}</div>` : ''}
                        ${ref && ref.notes ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">ℹ️ ${ref.notes}</div>` : ''}
                    </div>
                    <div style="display:flex; gap: 8px">
                        <button class="btn" style="padding: 4px 8px; font-size: 0.8rem" onclick="app.addExerciseNote(${idx})">📝</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.8rem" onclick="app.showExerciseInfo('${ex.id}')">⚙️</button>
                    </div>
                </div>
                ${ex.notes ? `<div style="font-size: 0.85rem; color: var(--primary); margin-bottom: 10px; font-style: italic; border-left: 2px solid var(--primary); padding-left: 8px;">"${ex.notes}"</div>` : ''}
                <div>
                   ${setsHtml}
                </div>
            `;
            list.appendChild(el);
        });
    },

    addExerciseNote(idx) {
        if (!this.data.activeWorkout) return;
        const ex = this.data.activeWorkout.exercises[idx];
        const note = prompt("Add note for this execution:", ex.notes || "");
        if (note !== null) {
            ex.notes = note;
            this.saveData();
            this.renderActiveWorkout();
        }
    },

    renderFreeWorkout(view, w) {
        view.innerHTML = `
             <div class="section-header">
                <h3>Free Training</h3>
                <button class="btn" style="color: var(--danger)" onclick="app.finishWorkout()">Finish</button>
            </div>
            <h2>${w.name}</h2>
            
            <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label>Distance (km)</label>
                    <input type="number" step="0.1" value="${w.metrics.distance || ''}" onchange="app.updateFreeMetric('distance', this.value)">
                </div>
                
                 <div>
                    <label>Steps</label>
                    <input type="number" value="${w.metrics.steps || ''}" onchange="app.updateFreeMetric('steps', this.value)">
                </div>

                 <div>
                    <label>Terrain / Conditions</label>
                    <input type="text" placeholder="e.g. Hilly, Snow, Indoor" value="${w.metrics.terrain || ''}" onchange="app.updateFreeMetric('terrain', this.value)">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 8px">Notes</label>
                    <textarea rows="4" onchange="app.updateFreeMetric('notes', this.value)">${w.notes || ''}</textarea>
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
        // Copy previous set if exists, or blank
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
        if (!confirm('Remove set?')) return;

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
        if (!confirm('Finish workout?')) return;

        const w = this.data.activeWorkout;
        w.endTime = Date.now();
        w.finished = true;

        this.data.workouts.push(w);
        this.data.activeWorkout = null;
        this.saveData();

        this.navigate('dashboard');
    },

    addExerciseToWorkout() {
        // Simple prompt for now, better UI later
        const list = this.data.exercises.map(e => `${e.id}: ${e.name}`).join('\n');
        const id = prompt(`Enter ID of exercise to add:\n${list}`); // Quick MVP hack
        if (id) {
            const ex = this.data.exercises.find(e => e.id === id || e.name === id); // strict id check or name
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
                <h3>My Plans</h3>
                <button class="btn btn-primary" onclick="app.createPlan()">+ New</button>
            </div>
            <div class="list-container">
                ${this.data.plans.map(p => `
                    <div class="list-item">
                        <div>
                            <strong>${p.name}</strong>
                            <div style="font-size: 0.8rem; color: var(--text-muted)">${p.exercises.length} Exercises</div>
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
        const name = prompt("Plan Name:");
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
        if (!confirm('Delete plan?')) return;

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
                <h3>Editing: ${plan.name}</h3>
                <button class="btn" onclick="app.renderPlans()">Done</button>
            </div>
            <div class="list-container">
                ${plan.exercises.map((e, idx) => {
            const ref = this.data.exercises.find(x => x.id === e.id);
            return `
                    <div class="list-item" style="flex-direction: column; align-items: stretch;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 8px">
                            <strong>${ref ? ref.name : e.id}</strong>
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
                    <button class="btn btn-primary" onclick="app.addExerciseToPlan('${planId}')">+ Add Exercise</button>
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
        if (!confirm('Remove exercise from plan?')) return;

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
                    if (document.getElementById('plans-view').innerHTML.includes(p.name)) {
                        this.renderPlanEditor(planId);
                    }
                }
            });
        }
    },

    addExerciseToPlan(planId) {
        const list = this.data.exercises.map(e => `${e.id}: ${e.name}`).join('\n');
        const id = prompt(`Enter ID of exercise to add:\n${list}`);
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
                <h3>Library</h3>
                <button class="btn btn-primary" onclick="app.createExercise()">+ New</button>
            </div>
            <div class="list-container">
                ${this.data.exercises.map(e => `
                    <div class="list-item" onclick="app.showExerciseInfo('${e.id}')">
                        <div>
                            <strong>${e.name}</strong>
                            <div style="font-size: 0.8rem; color: var(--text-muted)">${e.type}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    createExercise() {
        const name = prompt("Exercise Name:");
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
                <label>Notes</label>
                <textarea rows="3" id="edit-notes">${ex.notes || ''}</textarea>
                
                <label style="margin-top: 10px; display:block">Video URL</label>
                <input type="text" id="edit-video" value="${ex.video || ''}">
                
                ${ex.video ? `<a href="${ex.video}" target="_blank" style="display:block; margin-top:10px; color: var(--primary)">Watch Video</a>` : ''}
                
                <button class="btn btn-primary" style="margin-top: 20px; width: 100%" onclick="app.saveExerciseInfo('${id}')">Save Changes</button>
            </div>
        `;
        this.showModal(ex.name, content);
    },

    saveExerciseInfo(id) {
        const ex = this.data.exercises.find(e => e.id === id);
        if (ex) {
            ex.notes = document.getElementById('edit-notes').value;
            ex.video = document.getElementById('edit-video').value;
            this.saveData();
            this.closeModal();
            this.renderExercises(); // refresh if on that page
        }
    },

    // --- REPORTS ---
    renderReports() {
        const view = document.getElementById('reports-view');

        const historyHtml = this.data.workouts.slice().reverse().map(w => {
            const date = new Date(w.startTime).toLocaleString(undefined, {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            let summary = '';
            if (w.type === 'free') {
                summary = `<span>${w.metrics.distance || 0} km</span> • <span>${w.metrics.steps || 0} steps</span>`;
            } else {
                const totalSets = w.exercises.reduce((acc, ex) => acc + (ex.setsData ? ex.setsData.length : 0), 0);
                summary = `<span>${w.exercises.length} Exercises</span> • <span>${totalSets} Sets</span>`;
            }

            return `
                <div class="list-item" style="display:block; cursor: pointer" onclick="app.viewWorkoutDetails(${w.id})">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <strong>${w.name}</strong>
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
                <h3>Workout History</h3>
            </div>
            <div class="list-container">
                ${historyHtml || '<div class="empty-state">No history yet</div>'}
            </div>
        `;
    },

    viewWorkoutDetails(workoutId) {
        const w = this.data.workouts.find(x => x.id === workoutId);
        if (!w) return;

        // Sort exercises: if linked to a plan, try to match plan order
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
                        <strong style="color: var(--primary)">${ref ? ref.name : 'Unknown Exercise'}</strong>
                    </div>
                    ${ex.notes ? `<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; font-style: italic;">"${ex.notes}"</div>` : ''}
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
                <!-- Could make free metrics editable too if needed, simplified for now -->
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
                     <textarea rows="3" onchange="app.updateHistoryMetric(${w.id}, 'notes', this.value)">${w.notes || ''}</textarea>
                </div>
            </div>
        ` : '';

        const content = `
            <div style="max-height: 70vh; overflow-y: auto;">
                ${w.type === 'free' ? freeDetails : detailsHtml}
            </div>
        `;

        this.showModal(w.name, content);
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
