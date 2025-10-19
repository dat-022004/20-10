const canvas = document.getElementById('canvas');
const wishesEl = document.getElementById('wishes');

// Thêm nhận diện mobile
const isMobile = /Mobi|Android|iPhone|iPad|iPod|iOS/i.test(navigator.userAgent);

// Scene, renderer, camera
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
// Bật nền đen tuyệt đối
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 2.2, 13.5);
scene.add(camera);

// Soft ambient feel
const light = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(light);

// Helpers: random, lerp
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

// Single fixed wish text
const wishes = [
	"Không chỉ hôm nay, mà mỗi ngày anh đều muốn mang đến cho em niềm vui và hạnh phúc. Chúc em Hìn 20/10 tràn ngập yêu thương! H <3 Đ"
];
const wordsForRing = "Em • Luôn • Xinh • Đẹp • Vui • Vẻ • Cảm • Ơn • Em • Nhiều • Lắm • 20/10 • Yêu • Em".split("•").map(s => s.trim());

// Texture cache for characters
const textureCache = new Map();
function makeCharTexture(char, color = '#ffc0da') {
	// prettier cursive letter with stronger glow, gradient and dual strokes
	const key = `${char}|${color}|v3`;
	if (textureCache.has(key)) return textureCache.get(key);

	const size = 128;
	const cvs = document.createElement('canvas');
	cvs.width = cvs.height = size;
	const ctx = cvs.getContext('2d');

	ctx.clearRect(0, 0, size, size);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	// soft glow
	ctx.shadowColor = color;
	ctx.shadowBlur = 26;

	// rich gradient fill
	const grad = ctx.createLinearGradient(0, 0, 0, size);
	grad.addColorStop(0.0, '#ffffff');
	grad.addColorStop(0.45, color);
	grad.addColorStop(1.0, '#ba68c8');

	// cursive font stack (Great Vibes in HTML)
	ctx.font = 'bold 86px "Great Vibes", "Dancing Script", "Segoe Script", "Segoe UI", system-ui, Arial';

	// fill
	ctx.fillStyle = grad;
	ctx.fillText(char, size / 2, size / 2);

	// outer soft stroke
	ctx.lineWidth = 3.2;
	ctx.strokeStyle = 'rgba(255,255,255,0.7)';
	ctx.strokeText(char, size / 2, size / 2);

	// inner colored stroke for crisp edge
	ctx.lineWidth = 1.4;
	ctx.strokeStyle = 'rgba(255,105,180,0.9)';
	ctx.strokeText(char, size / 2, size / 2);

	const tex = new THREE.CanvasTexture(cvs);
	tex.minFilter = THREE.LinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.needsUpdate = true;
	textureCache.set(key, tex);
	return tex;
}

function makeSprite(char, color, size = 0.35) {
	const mat = new THREE.SpriteMaterial({ map: makeCharTexture(char, color), transparent: true, depthWrite: false });
	const sp = new THREE.Sprite(mat);
	sp.scale.set(size, size, 1);
	return sp;
}

// Universe background (add after scene is created)
(function createSpaceBackground() {
	const w = 2048, h = 1024;
	const cv = document.createElement('canvas');
	cv.width = w; cv.height = h;
	const g = cv.getContext('2d');

	// Deep space gradient
	const grad = g.createLinearGradient(0, 0, 0, h);
	grad.addColorStop(0, '#060414');
	grad.addColorStop(0.5, '#0b0525');
	grad.addColorStop(1, '#020109');
	g.fillStyle = grad;
	g.fillRect(0, 0, w, h);

	// Soft nebulas
	function nebula(x, y, r, c1, c2) {
		const rg = g.createRadialGradient(x, y, 0, x, y, r);
		rg.addColorStop(0, c1);
		rg.addColorStop(1, c2);
		g.globalCompositeOperation = 'lighter';
		g.fillStyle = rg;
		g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
		g.globalCompositeOperation = 'source-over';
	}
	nebula(w * 0.75, h * 0.35, 260, 'rgba(255,120,200,0.20)', 'rgba(120,60,200,0.02)');
	nebula(w * 0.25, h * 0.65, 220, 'rgba(120,180,255,0.18)', 'rgba(40,80,180,0.02)');
	nebula(w * 0.55, h * 0.75, 180, 'rgba(255,170,220,0.14)', 'rgba(80,30,140,0.02)');

	// Distant stars on background
	const starCount = 1400;
	for (let i = 0; i < starCount; i++) {
		const x = Math.random() * w;
		const y = Math.random() * h;
		const s = Math.random() * 1.8 + 0.2;
		const a = Math.random() * 0.7 + 0.3;
		g.fillStyle = `rgba(255,255,255,${a})`;
		g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
	}

	const tex = new THREE.CanvasTexture(cv);
	tex.anisotropy = 4;
	tex.needsUpdate = true;
	scene.background = tex;
})();

// Starfield (denser and finer points)
(function starfield() {
	const geo = new THREE.BufferGeometry();
	// Giảm số lượng sao trên mobile
	const STAR_COUNT = isMobile ? 4000 : 8000;
	const pos = new Float32Array(STAR_COUNT * 3);
	for (let i = 0; i < STAR_COUNT; i++) {
		const r = rand(25, 80);
		const theta = rand(0, Math.PI * 2);
		const phi = rand(0, Math.PI);
		pos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
		pos[i * 3 + 1] = r * Math.cos(phi);
		pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
	}
	geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.015, transparent: true, opacity: 0.9, depthWrite: false });
	scene.add(new THREE.Points(geo, mat));
})();

// Heart target points (bigger heart)
function heartPoint(t, scale = 0.16, yOffset = 1.5) {
	// Classic heart curve (2D), with slight z jitter later
	const x = scale * (16 * Math.pow(Math.sin(t), 3));
	const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) + yOffset;
	return new THREE.Vector3(x, y, 0);
}
function makeHeartTargets(n) {
	const arr = [];
	for (let i = 0; i < n; i++) {
		const t = (i / n) * Math.PI * 2 + rand(-0.05, 0.05);
		const p = heartPoint(t);
		p.z = rand(-1.2, 1.2); // more depth for a fuller 3D heart
		arr.push(p);
	}
	return arr;
}

// Rotating word ring on the ground
const ringGroup = new THREE.Group();
scene.add(ringGroup);
function makeTextSprite(text, color = '#ffffff', size = 0.5) {
	const cv = document.createElement('canvas');
	cv.width = cv.height = 256;
	const c2d = cv.getContext('2d');
	c2d.clearRect(0, 0, 256, 256);
	// gradient text + glow
	const grad = c2d.createLinearGradient(0, 0, 0, 256);
	grad.addColorStop(0, '#ffffff');
	grad.addColorStop(1, color);
	c2d.fillStyle = grad;
	c2d.textAlign = 'center';
	c2d.textBaseline = 'middle';
	c2d.shadowColor = color;
	c2d.shadowBlur = 16;
	c2d.font = 'bold 72px "Great Vibes", "Dancing Script", "Segoe Script", "Segoe UI", system-ui, Arial';
	c2d.fillText(text, 128, 128);
	c2d.lineWidth = 2;
	c2d.strokeStyle = 'rgba(255,255,255,0.85)';
	c2d.strokeText(text, 128, 128);
	const tex = new THREE.CanvasTexture(cv);
	const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 });
	const sp = new THREE.Sprite(mat);
	sp.scale.set(size * 2.2, size * 1.1, 1);
	return sp;
}
(function buildWordRing() {
	const radius = 6.2;
	const y = -2.0;
	for (let i = 0; i < wordsForRing.length; i++) {
		const angle = (i / wordsForRing.length) * Math.PI * 2;
		const s = makeTextSprite(wordsForRing[i], i % 2 ? '#ffd1e6' : '#ffffff', 0.6);
		s.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
		// Face inward to center
		s.lookAt(new THREE.Vector3(0, y, 0));
		ringGroup.add(s);
	}
})();

// Particles (letters + hearts)
const COLORS = ['#ffd1e6', '#ff9bc2', '#ffc8dd', '#ff7eb6', '#fff0f6', '#fff'];
const CHAR_POOL = ('❤❤❤❤❤ ' + 'Chuc mung 20/10 Em Yeu').split(''); // mix hearts + letters
// Giảm số hạt trên mobile
const COUNT = isMobile ? 1200 : 2400;

const particles = [];
const orbitParticles = []; // NEW: orbiting ring
const targets = makeHeartTargets(COUNT);
const startArea = { x: 10, z: 10, yMin: 6, yMax: 12 };
const ringY = -2.0;

for (let i = 0; i < COUNT; i++) {
	const ch = CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)] || '❤';
	const col = COLORS[Math.floor(Math.random() * COLORS.length)];
	const sp = makeSprite(ch, col, rand(0.28, 0.42));
	sp.userData = {
		// store for later re-texturing after fonts load
		char: ch,
		color: col,
		phase: 0, // 0 falling, 1 swirl, 2 toHeart, 3 settled
		angle: rand(0, Math.PI * 2),
		speed: rand(0.6, 1.2),
		target: targets[i].clone(),
		ringRadius: rand(2.0, 6.0),
		delay: i * 0.0025
	};
	sp.position.set(rand(-startArea.x, startArea.x), rand(startArea.yMin, startArea.yMax), rand(-startArea.z, startArea.z));
	scene.add(sp);
	particles.push(sp);
}

// NEW: musical-note orbiting ring around the heart (planet ring)
const ORBIT_COUNT = isMobile ? 360 : 700;
const ORBIT_CHAR_POOL = ['♪','♫','♩','♬','♭','♮','♯'];
const MUSIC_COLORS = ['#9be7ff', '#a7ffeb', '#fff59d', '#ffd1e6', '#b388ff', '#80d8ff'];
for (let i = 0; i < ORBIT_COUNT; i++) {
	const ch = ORBIT_CHAR_POOL[Math.floor(Math.random() * ORBIT_CHAR_POOL.length)];
	const col = MUSIC_COLORS[Math.floor(Math.random() * MUSIC_COLORS.length)];
	const sp = makeSprite(ch, col, rand(0.26, 0.36));
	sp.userData = {
		char: ch,
		color: col,
		phase: 0,              // 0 fall to plane, 1 orbit
		angle: rand(0, Math.PI * 2),
		speed: rand(0.5, 1.0), // angular speed
		radius: rand(2.3, 3.6),
		tilt: rand(-0.35, 0.35),
		waveAmp: rand(0.10, 0.22),
		delay: 0.8 + i * 0.003
	};
	sp.position.set(rand(-10, 10), rand(6, 12), rand(-10, 10));
	scene.add(sp);
	orbitParticles.push(sp);
}

// Refresh textures once web fonts are ready (for crisp cursive)
if (document.fonts && document.fonts.ready) {
	document.fonts.ready.then(() => {
		textureCache.clear();
		[...particles, ...orbitParticles].forEach(p => {
			p.material.map = makeCharTexture(p.userData.char, p.userData.color);
			p.material.needsUpdate = true;
		});
	});
}

// Show wishes when most particles have settled
let shownWish = false;
function maybeShowWish() {
	if (shownWish) return;
	const settled = particles.reduce((acc, p) => acc + (p.userData.phase === 3 ? 1 : 0), 0);
	if (settled > COUNT * 0.65) {
		shownWish = true;
		wishesEl.textContent = wishes[Math.floor(Math.random() * wishes.length)];
		wishesEl.style.opacity = '1';
	}
}

// Autoplay music: try audible first (very low volume), seek after playback starts, fallback to muted, then auto-unmute + fade-in
// === Force autoplay background music ===
{
	const bgm = document.getElementById('bgm');
	if (bgm) {
		bgm.loop = true;
		bgm.volume = 0.7;

		// Tạo context Web Audio để "fake click" tự kích hoạt âm thanh
		const AudioContext = window.AudioContext || window.webkitAudioContext;
		const ctx = new AudioContext();

		const playAudio = async () => {
			try {
				if (ctx.state === "suspended") await ctx.resume();
				await bgm.play();
			} catch (e) {
				// fallback: retry sau vài giây nếu bị chặn
				setTimeout(() => playAudio(), 2000);
			}
		};

		// Tự động kích hoạt khi DOM tải xong
		window.addEventListener("load", playAudio);

		// Khi người dùng bấm hoặc chạm, thử lại (nếu autoplay bị chặn)
		["click", "touchstart", "pointerdown"].forEach(evt => {
			window.addEventListener(evt, () => playAudio(), { once: true });
		});

		// Nếu người dùng chuyển tab rồi quay lại
		document.addEventListener("visibilitychange", () => {
			if (!document.hidden && bgm.paused) playAudio();
		});
	}
}


// Animation loop
const clock = new THREE.Clock();
// Giới hạn FPS cho mobile để mượt và đỡ nóng máy
const MAX_FPS = isMobile ? 48 : 60;
const FRAME_INTERVAL = 1000 / MAX_FPS;
let lastFrame = 0;

function animate(nowMs) {
	// Throttle FPS
	if (nowMs - lastFrame < FRAME_INTERVAL) {
		requestAnimationFrame(animate);
		return;
	}
	lastFrame = nowMs;

	const t = clock.getElapsedTime();
	const dt = clock.getDelta();

	// Camera slow drift
	camera.position.x = Math.cos(t * 0.15) * 0.6;
	camera.position.y = 2.1 + Math.sin(t * 0.1) * 0.2;
	camera.lookAt(0, 1.5, 0);

	// Ring rotate
	ringGroup.rotation.y += 0.12 * dt;

	// Update heart-forming particles
	for (let i = 0; i < COUNT; i++) {
		const p = particles[i];
		const d = p.userData;
		const localT = Math.max(0, t - d.delay);

		if (d.phase === 0) { // falling towards ring
			const target = new THREE.Vector3(Math.cos(d.angle) * d.ringRadius, ringY, Math.sin(d.angle) * d.ringRadius);
			p.position.x = lerp(p.position.x, target.x, 0.015 + 0.02 * dt);
			p.position.y = lerp(p.position.y, target.y, 0.02 + 0.04 * dt);
			p.position.z = lerp(p.position.z, target.z, 0.015 + 0.02 * dt);
			if (localT > 2.0) d.phase = 1;
		} else if (d.phase === 1) { // swirl on ring
			d.angle += d.speed * 0.8 * dt;
			const r = d.ringRadius = d.ringRadius * (1 + 0.0) ; // keep radius stable
			p.position.set(Math.cos(d.angle) * r, ringY + Math.sin(t * 2 + i) * 0.05, Math.sin(d.angle) * r);
			if (localT > 4.0) d.phase = 2;
		} else if (d.phase === 2) { // go to heart target
			p.position.x = lerp(p.position.x, d.target.x, 0.03 + 0.04 * dt);
			p.position.y = lerp(p.position.y, d.target.y, 0.03 + 0.04 * dt);
			p.position.z = lerp(p.position.z, d.target.z, 0.03 + 0.04 * dt);
			if (p.position.distanceTo(d.target) < 0.05) d.phase = 3;
		} else { // settled, slight twinkle
			const s = 1 + Math.sin(t * 3 + i) * 0.03;
			p.scale.setScalar(s * p.scale.x);
		}
	}

	// NEW: Update orbiting ring particles
	for (let i = 0; i < orbitParticles.length; i++) {
		const p = orbitParticles[i];
		const d = p.userData;
		const localT = Math.max(0, t - d.delay);

		if (d.phase === 0) {
			// settle to orbit plane near heart first
			const planeY = 1.5;
			p.position.x = lerp(p.position.x, 0, 0.02 + 0.03 * dt);
			p.position.y = lerp(p.position.y, planeY, 0.02 + 0.03 * dt);
			p.position.z = lerp(p.position.z, 0, 0.02 + 0.03 * dt);
			if (localT > 1.0) d.phase = 1;
		} else {
			// orbit with slight tilt and wave
			d.angle += d.speed * 0.7 * dt;
			const r = d.radius * (1.0 + 0.08 * Math.sin(t * 2.2 + i));
			const x = Math.cos(d.angle) * r;
			const z = Math.sin(d.angle) * r;
			const y = 1.5 + Math.sin(d.angle * 2 + i * 0.5) * d.waveAmp + d.tilt * Math.sin(d.angle);
			p.position.set(x, y, z);
			p.material.rotation = Math.sin(t * 2 + i) * 0.5;
		}
	}

	maybeShowWish();

	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Resize handling
window.addEventListener('resize', () => {
	const w = window.innerWidth, h = window.innerHeight;
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	// Cập nhật pixelRatio theo thiết bị khi xoay màn hình
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
	renderer.setSize(w, h);
});


