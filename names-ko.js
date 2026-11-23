// 한국어 표시 이름: 주문(폼 포함)과 속성 그룹. 원본 모듈(lib/ultra-elements)은 건드리지 않고
// 화면에 보이는 이름만 여기서 바꿉니다. demo.js(화면 표시)와 make-recipe.mjs(recipe.json 생성)가 함께 씁니다.

// 속성 그룹 id → 한국어 라벨
export const GROUP_KO = {
	lightning: '번개',
	fire: '불',
	water: '물',
	ice: '얼음',
	earth: '대지',
	wind: '바람',
	void: '공허',
	light: '빛',
	acid: '산성',
	arcane: '비전',
	hybrid: '혼합',
};

// 영어 표시 이름(폼 포함 39개) → 한국어 이름
export const SPELL_KO = {
	'Thunderstrike': '뇌격',
	'Chain Arc': '연쇄 아크',
	'Ball Lightning': '구형 번개',
	'Thunderstorm': '뇌우',
	'Fireball': '화염구',
	'Inferno': '지옥불',
	'Phoenix': '불사조',
	'Ember Swarm': '불씨 떼',
	'Tidal Lance': '해일의 창',
	'Geyser': '간헐천',
	'Tsunami': '쓰나미',
	'Glacial Spike': '빙하의 가시',
	'Ice Wall': '얼음 벽',
	'Absolute Zero': '절대 영도',
	'Blizzard': '눈보라',
	'Upheaval': '지반 융기',
	'Meteor': '운석',
	'Fissure': '지각 균열',
	'Lava Geyser': '용암 분출',
	'Cyclone': '회오리',
	'Wind Slash': '바람 베기',
	'Dust Devils': '먼지 회오리',
	'Singularity': '특이점',
	'Rift': '차원 균열',
	'Portal': '포털',
	'Judgment': '심판',
	'Radiant Lance': '광휘의 창',
	'Solar Flare': '태양 플레어',
	'Aurora Veil': '오로라 장막',
	'Supernova': '초신성',
	'Toxic Bloom': '맹독의 꽃',
	'Corrosion Cloud': '부식 구름',
	'Plague Swarm': '역병 떼',
	'Arcane Barrage': '비전 탄막',
	'Aegis': '아이기스',
	'Starfall': '별똥',
	'Frozen Lightning': '얼어붙은 번개',
	'Fire Tornado': '불 회오리',
	'Black Flame': '검은 불꽃',
};

export const spellKo = (name) => SPELL_KO[name] ?? name;
export const groupKo = (id) => GROUP_KO[id] ?? id;
