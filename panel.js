// 독립 배포판 설정 패널: Patch 호스트가 recipe.json의 컨트롤로 그려 주던 설정 UI를,
// 호스트가 없는 GitHub Pages 배포판에서 스스로 그립니다. 컨트롤의 종류·범위·기본값은
// recipe.json 그대로이고, 값 변경은 demo.js의 기존 경로(window.__block.set / hooks.onTrigger)를 씁니다.

const fmt = (control, value) => {
	if (control.type !== 'number') return String(value);
	const step = control.step ?? 1;
	const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
	const rounded = Math.round(value / step) * step;
	return `${rounded.toFixed(decimals)}${control.unit ?? ''}`;
};

export function mountPanel(recipeBlock) {
	const toggle = document.getElementById('panel-toggle');
	const panel = document.getElementById('panel');
	if (!toggle || !panel || !recipeBlock) return;

	const set = (id, value) => window.__block?.set(id, value);
	const current = () => window.__block?.values ?? {};
	const controls = recipeBlock.controls ?? [];
	const triggers = recipeBlock.triggers ?? [];

	panel.innerHTML = '<h2>설정</h2>';
	const syncers = [];

	for (const control of controls) {
		const wrap = document.createElement('div');
		wrap.className = 'ctl';
		const head = document.createElement('label');
		const name = document.createElement('span');
		name.textContent = control.label;
		head.appendChild(name);

		if (control.type === 'number') {
			const val = document.createElement('span');
			val.className = 'val';
			val.textContent = fmt(control, current()[control.id] ?? control.default);
			head.appendChild(val);
			const input = document.createElement('input');
			input.type = 'range';
			input.min = control.min;
			input.max = control.max;
			input.step = control.step;
			input.value = current()[control.id] ?? control.default;
			input.addEventListener('input', () => {
				const v = Number(input.value);
				val.textContent = fmt(control, v);
				set(control.id, v);
			});
			wrap.append(head, input);
		} else if (control.type === 'toggle') {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'tog';
			btn.setAttribute('aria-label', control.label);
			const knob = document.createElement('i');
			btn.appendChild(knob);
			const apply = (on) => btn.classList.toggle('on', !!on);
			apply(current()[control.id] ?? control.default);
			btn.addEventListener('click', () => {
				const on = !btn.classList.contains('on');
				apply(on);
				set(control.id, on);
			});
			head.appendChild(btn);
			wrap.append(head);
		} else if (control.type === 'color') {
			const input = document.createElement('input');
			input.type = 'color';
			input.value = current()[control.id] ?? control.default ?? '#ffffff';
			input.addEventListener('input', () => set(control.id, input.value));
			wrap.append(head, input);
		} else if (control.type === 'choice' && control.options?.some((o) => o.image)) {
			// 그림이 있는 선택(주문): 속성 그룹별 썸네일 그리드
			wrap.appendChild(head);
			const grid = document.createElement('div');
			grid.className = 'spellgrid';
			const buttons = new Map();
			let lastGroup = null;
			for (const option of control.options) {
				if (option.group !== lastGroup) {
					lastGroup = option.group;
					const g = document.createElement('div');
					g.className = 'grp';
					g.textContent = option.group;
					grid.appendChild(g);
				}
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.title = option.label;
				if (option.image) {
					const img = document.createElement('img');
					img.src = option.image;
					img.alt = option.label;
					img.loading = 'lazy';
					btn.appendChild(img);
				}
				const span = document.createElement('span');
				span.textContent = option.label;
				btn.appendChild(span);
				btn.addEventListener('click', () => set(control.id, option.value));
				buttons.set(option.value, btn);
				grid.appendChild(btn);
			}
			const apply = (value) => {
				for (const [v, b] of buttons) b.classList.toggle('on', v === value);
				const on = buttons.get(value);
				if (on) on.scrollIntoView({ block: 'nearest' });
			};
			apply(current()[control.id] ?? control.default);
			syncers.push(() => apply(current()[control.id]));
			wrap.appendChild(grid);
		} else if (control.type === 'choice') {
			wrap.appendChild(head);
			const seg = document.createElement('div');
			seg.className = 'seg';
			for (const option of control.options ?? []) {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.textContent = option.label;
				btn.classList.toggle('on', (current()[control.id] ?? control.default) === option.value);
				btn.addEventListener('click', () => {
					set(control.id, option.value);
					for (const b of seg.children) b.classList.toggle('on', b === btn);
				});
				seg.appendChild(btn);
			}
			wrap.appendChild(seg);
		}

		if (control.hint) {
			const hint = document.createElement('p');
			hint.className = 'hint';
			hint.textContent = control.hint;
			wrap.appendChild(hint);
		}
		panel.appendChild(wrap);
	}

	for (const trigger of triggers) {
		const wrap = document.createElement('div');
		wrap.className = 'ctl';
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'trigger';
		btn.textContent = trigger.label;
		btn.addEventListener('click', () => window.__block?.hooks.onTrigger(trigger.id));
		wrap.appendChild(btn);
		if (trigger.hint) {
			const hint = document.createElement('p');
			hint.className = 'hint';
			hint.textContent = trigger.hint;
			wrap.appendChild(hint);
		}
		panel.appendChild(wrap);
	}

	// '전부 시전' 중 데모가 스스로 바꾼 값을 패널에 반영
	setInterval(() => {
		if (!panel.hidden) for (const sync of syncers) sync();
	}, 500);

	toggle.hidden = false;
	const desktop = matchMedia('(min-width: 721px)').matches;
	panel.hidden = !desktop;
	toggle.addEventListener('click', () => {
		panel.hidden = !panel.hidden;
	});
}
