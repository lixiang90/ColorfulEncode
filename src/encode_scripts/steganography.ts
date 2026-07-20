// Name: DCT 图片隐写
// Description: 基于DCT的图片隐写术 (抗JPEG压缩)，可在图片中隐藏/提取文字
// Avatar: 🖼️

/**
 * DCT-based Image Steganography
 * 
 * Uses 8x8 block DCT (Discrete Cosine Transform) to embed text in images.
 * Data is embedded in mid-frequency DCT coefficients, making it robust
 * against JPEG compression and common image processing.
 * 
 * Encode: Embed text into an image → returns data URL of modified image
 * Decode: Extract hidden text from a data URL image
 * 
 * Configuration (SCRIPT_CONFIG):
 *   image_url   - Image URL (default: /default_image.jpg)
 *   password    - Optional password for seeded coefficient selection
 *   strength    - Embedding strength 1-10 (default: 5, higher = more robust)
 */

function get_config_schema() {
    return {
        params: [
            {
                name: "image_url",
                label: "载体图片 URL (Carrier Image URL)",
                type: "text",
                placeholder: "/default_image.jpg"
            },
            {
                name: "password",
                label: "密码 (Password) - 可选",
                type: "password",
                placeholder: "留空则使用默认参数"
            },
            {
                name: "strength",
                label: "嵌入强度 (1-10)",
                type: "text",
                placeholder: "5 (默认)"
            }
        ]
    };
}

// ==================== DCT Implementation ====================

// Pre-computed DCT coefficients for 8x8 blocks
function buildDCTTables() {
    const N = 8;
    const cosTable = new Array(N * N * N * N);
    const C = new Array(N);
    for (let i = 0; i < N; i++) {
        C[i] = i === 0 ? 1 / Math.sqrt(2) : 1;
    }
    for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
            for (let x = 0; x < N; x++) {
                for (let y = 0; y < N; y++) {
                    cosTable[u * N * N * N + v * N * N + x * N + y] =
                        Math.cos((2 * x + 1) * u * Math.PI / 16) *
                        Math.cos((2 * y + 1) * v * Math.PI / 16);
                }
            }
        }
    }
    return { C, cosTable, N };
}

const { C: DCT_C, cosTable: DCT_COS, N: DCT_N } = buildDCTTables();

// Forward 2D DCT on 8x8 block
function forwardDCT(block) {
    const N = DCT_N;
    const result = new Array(N * N);
    for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
            let sum = 0;
            for (let x = 0; x < N; x++) {
                for (let y = 0; y < N; y++) {
                    sum += block[x * N + y] * DCT_COS[u * N * N * N + v * N * N + x * N + y];
                }
            }
            result[u * N + v] = 0.25 * DCT_C[u] * DCT_C[v] * sum;
        }
    }
    return result;
}

// Inverse 2D DCT on 8x8 block
function inverseDCT(dctBlock) {
    const N = DCT_N;
    const result = new Array(N * N);
    for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
            let sum = 0;
            for (let u = 0; u < N; u++) {
                for (let v = 0; v < N; v++) {
                    sum += DCT_C[u] * DCT_C[v] * dctBlock[u * N + v] *
                        Math.cos((2 * x + 1) * u * Math.PI / 16) *
                        Math.cos((2 * y + 1) * v * Math.PI / 16);
                }
            }
            result[x * N + y] = 0.25 * sum;
        }
    }
    return result;
}

// ==================== Zigzag Ordering ====================

const ZIGZAG = [
     0,  1,  8, 16,  9,  2,  3, 10,
    17, 24, 32, 25, 18, 11,  4,  5,
    12, 19, 26, 33, 40, 48, 41, 34,
    27, 20, 13,  6,  7, 14, 21, 28,
    35, 42, 49, 56, 57, 50, 43, 36,
    29, 22, 15, 23, 30, 37, 44, 51,
    58, 59, 52, 45, 38, 31, 39, 46,
    53, 60, 61, 54, 47, 55, 62, 63
];

// Select mid-frequency coefficient indices for embedding
// We use medium-frequency coefficients that survive JPEG compression well
function getEmbedPositions(strength) {
    // Strength controls which coefficients to use (higher = lower freq = more robust)
    const baseIdx = Math.max(3, Math.min(8, 10 - strength));
    // Use pairs of mid-frequency coefficients
    const pairs = [];
    for (let i = 0; i < 16; i += 2) {
        const idx1 = baseIdx + i;
        const idx2 = baseIdx + i + 1;
        if (idx2 < 50) {
            pairs.push([ZIGZAG[idx1], ZIGZAG[idx2]]);
        }
    }
    return pairs;
}

// ==================== Embedding / Extraction ====================

function textToBits(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    // Prefix with 32-bit length for reliable extraction
    const lengthBits = [];
    for (let i = 0; i < 32; i++) {
        lengthBits.push((bytes.length >> (31 - i)) & 1);
    }
    const dataBits = [];
    for (const byte of bytes) {
        for (let i = 7; i >= 0; i--) {
            dataBits.push((byte >> i) & 1);
        }
    }
    return lengthBits.concat(dataBits);
}

function bitsToText(bits) {
    // Read 32-bit length prefix
    let length = 0;
    for (let i = 0; i < 32; i++) {
        if (bits[i]) {
            length |= (1 << (31 - i));
        }
    }
    if (length <= 0 || length > 100000) {
        throw new Error("未检测到有效的隐藏数据或数据已损坏");
    }
    
    const bytes = [];
    let bitIdx = 32;
    for (let i = 0; i < length; i++) {
        let byte = 0;
        for (let j = 7; j >= 0; j--) {
            if (bitIdx < bits.length) {
                byte |= (bits[bitIdx] << j);
                bitIdx++;
            }
        }
        bytes.push(byte);
    }
    
    try {
        return new TextDecoder().decode(new Uint8Array(bytes));
    } catch (e) {
        throw new Error("解码失败：数据格式错误");
    }
}

// Embed a single bit into a DCT block using coefficient pair comparison
function embedBitInBlock(dctBlock, bit, pos1, pos2, delta) {
    const c1 = dctBlock[pos1];
    const c2 = dctBlock[pos2];
    
    if (bit === 1) {
        // |c1| should be >= |c2| + delta
        if (Math.abs(c1) >= Math.abs(c2) + delta) {
            return; // Already satisfied
        }
        const avg = (Math.abs(c1) + Math.abs(c2)) / 2;
        const target1 = avg + delta / 2;
        const target2 = Math.max(0, avg - delta / 2);
        dctBlock[pos1] = dctBlock[pos1] >= 0 ? target1 : -target1;
        dctBlock[pos2] = dctBlock[pos2] >= 0 ? target2 : -target2;
    } else {
        // |c2| should be >= |c1| + delta
        if (Math.abs(c2) >= Math.abs(c1) + delta) {
            return; // Already satisfied
        }
        const avg = (Math.abs(c1) + Math.abs(c2)) / 2;
        const target2 = avg + delta / 2;
        const target1 = Math.max(0, avg - delta / 2);
        dctBlock[pos1] = dctBlock[pos1] >= 0 ? target1 : -target1;
        dctBlock[pos2] = dctBlock[pos2] >= 0 ? target2 : -target2;
    }
}

// Extract a single bit from a DCT block
function extractBitFromBlock(dctBlock, pos1, pos2) {
    return Math.abs(dctBlock[pos1]) >= Math.abs(dctBlock[pos2]) ? 1 : 0;
}

// Simple string hash for password-based seeding
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// ==================== Main Image Processing ====================

/**
 * Load image onto canvas and return { canvas, ctx, imageData }
 */
function loadImageToCanvas(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Resize to even dimensions for 8x8 block processing
            const w = Math.floor(img.width / 8) * 8;
            const h = Math.floor(img.height / 8) * 8;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            resolve({ canvas, ctx, imageData, width: w, height: h });
        };
        img.onerror = () => reject(new Error("无法加载图片，请检查URL是否正确"));
        img.src = imageUrl;
    });
}

/**
 * Convert RGBA pixel data to luminance (grayscale) values
 */
function rgbToLuminance(imageData) {
    const pixels = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    const luma = new Float64Array(w * h);
    for (let i = 0; i < pixels.length; i += 4) {
        const idx = i / 4;
        // Standard luminance: Y = 0.299R + 0.587G + 0.114B
        luma[idx] = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    }
    return { luma, width: w, height: h };
}

/**
 * Replace luminance values back into RGBA
 */
function luminanceToRGBA(luma, originalImageData) {
    const pixels = originalImageData.data;
    const w = originalImageData.width;
    const h = originalImageData.height;
    for (let i = 0; i < pixels.length; i += 4) {
        const idx = i / 4;
        const y = luma[idx];
        // Preserve original chrominance, update luminance
        pixels[i] = Math.max(0, Math.min(255, Math.round(y)));
        pixels[i + 1] = Math.max(0, Math.min(255, Math.round(y)));
        pixels[i + 2] = Math.max(0, Math.min(255, Math.round(y)));
    }
    return originalImageData;
}

// ==================== Main encode/decode functions ====================

/**
 * Encode: embed text into an image
 * Returns a data URL of the resulting image
 */
async function encode(text) {
    if (!text || !text.trim()) {
        throw new Error("请输入要隐藏的文字");
    }

    // Read config
    const imageUrl = SCRIPT_CONFIG.image_url || '/default_image.jpg';
    const password = SCRIPT_CONFIG.password || '';
    const rawStrength = parseInt(SCRIPT_CONFIG.strength) || 5;
    const strength = Math.max(1, Math.min(10, rawStrength));

    // Embedding strength - higher delta = more robust but more visible
    const delta = 5 + strength * 3; // Range: 8 to 35

    // Load the carrier image
    const { canvas, ctx, imageData, width, height } = await loadImageToCanvas(imageUrl);

    // Convert to luminance
    const { luma } = rgbToLuminance(imageData);
    const totalBlocks = (width / 8) * (height / 8);

    // Get embed positions based on strength
    const embedPairs = getEmbedPositions(strength);
    const bitsPerBlock = embedPairs.length;

    // Convert text to bits
    const bits = textToBits(text);
    const totalBitsNeeded = bits.length;

    // Calculate how many blocks we need
    const blocksNeeded = Math.ceil(totalBitsNeeded / bitsPerBlock);
    if (blocksNeeded > totalBlocks) {
        throw new Error(
            `文字太长，需要 ${blocksNeeded} 个 8×8 块，但图片只有 ${totalBlocks} 个块。` +
            `\n请使用更大的图片或缩短文字。` +
            `\n当前图片容量: ~${Math.floor(totalBlocks * bitsPerBlock / 8)} 字节`
        );
    }

    // Use password to determine block ordering
    const passwordSeed = password ? hashString(password) : 0;
    const blockOrder = [];
    for (let i = 0; i < totalBlocks; i++) {
        blockOrder.push(i);
    }
    if (passwordSeed !== 0) {
        // Pseudo-random shuffle based on password
        let seed = passwordSeed;
        for (let i = blockOrder.length - 1; i > 0; i--) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            const j = seed % (i + 1);
            [blockOrder[i], blockOrder[j]] = [blockOrder[j], blockOrder[i]];
        }
    }

    // Process blocks
    let bitIndex = 0;
    const blocksPerRow = width / 8;
    const lumaCopy = new Float64Array(luma);

    for (let bi = 0; bi < totalBlocks && bitIndex < totalBitsNeeded; bi++) {
        const blockIdx = blockOrder[bi];
        const blockRow = Math.floor(blockIdx / blocksPerRow);
        const blockCol = blockIdx % blocksPerRow;

        // Extract 8x8 block
        const block = new Array(64);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                block[y * 8 + x] = lumaCopy[(blockRow * 8 + y) * width + (blockCol * 8 + x)];
            }
        }

        // Apply forward DCT
        const dctBlock = forwardDCT(block);

        // Embed bits in this block
        for (let p = 0; p < embedPairs.length && bitIndex < totalBitsNeeded; p++) {
            const [pos1, pos2] = embedPairs[p];
            embedBitInBlock(dctBlock, bits[bitIndex], pos1, pos2, delta);
            bitIndex++;
        }

        // Apply inverse DCT
        const reconstructed = inverseDCT(dctBlock);

        // Write back to luminance array
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                lumaCopy[(blockRow * 8 + y) * width + (blockCol * 8 + x)] = reconstructed[y * 8 + x];
            }
        }
    }

    // Convert back to RGBA image
    const newImageData = luminanceToRGBA(lumaCopy, imageData);
    ctx.putImageData(newImageData, 0, 0);

    // Return as data URL (PNG to preserve the DCT modifications losslessly)
    const dataUrl = canvas.toDataURL('image/png');
    
    return dataUrl;
}

/**
 * Decode: extract hidden text from an image data URL
 */
async function decode(text) {
    if (!text || !text.trim()) {
        throw new Error("请输入包含隐藏文字的图片数据 (data URL)");
    }

    const imageDataUrl = text.trim();
    const password = SCRIPT_CONFIG.password || '';
    const rawStrength = parseInt(SCRIPT_CONFIG.strength) || 5;
    const strength = Math.max(1, Math.min(10, rawStrength));

    // Load the image
    const { imageData, width, height } = await loadImageToCanvas(imageDataUrl);

    // Convert to luminance
    const { luma } = rgbToLuminance(imageData);
    const totalBlocks = (width / 8) * (height / 8);

    // Get embed positions
    const embedPairs = getEmbedPositions(strength);
    const bitsPerBlock = embedPairs.length;

    // Use password for block ordering
    const passwordSeed = password ? hashString(password) : 0;
    const blockOrder = [];
    for (let i = 0; i < totalBlocks; i++) {
        blockOrder.push(i);
    }
    if (passwordSeed !== 0) {
        let seed = passwordSeed;
        for (let i = blockOrder.length - 1; i > 0; i--) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            const j = seed % (i + 1);
            [blockOrder[i], blockOrder[j]] = [blockOrder[j], blockOrder[i]];
        }
    }

    // Extract bits (read enough for the length prefix first)
    const blocksPerRow = width / 8;
    const extractedBits = [];

    for (let bi = 0; bi < totalBlocks; bi++) {
        const blockIdx = blockOrder[bi];
        const blockRow = Math.floor(blockIdx / blocksPerRow);
        const blockCol = blockIdx % blocksPerRow;

        // Extract 8x8 block
        const block = new Array(64);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                block[y * 8 + x] = luma[(blockRow * 8 + y) * width + (blockCol * 8 + x)];
            }
        }

        // Apply forward DCT
        const dctBlock = forwardDCT(block);

        // Extract bits
        for (let p = 0; p < embedPairs.length; p++) {
            const [pos1, pos2] = embedPairs[p];
            extractedBits.push(extractBitFromBlock(dctBlock, pos1, pos2));
        }

        // If we have enough bits to check the length, we can stop early
        if (extractedBits.length >= 32) {
            // Try to determine the total length
            let totalLen = 0;
            for (let i = 0; i < 32; i++) {
                if (extractedBits[i]) {
                    totalLen |= (1 << (31 - i));
                }
            }
            const totalBitsNeeded = 32 + totalLen * 8;
            if (totalLen > 0 && totalLen < 100000 && extractedBits.length >= totalBitsNeeded) {
                break;
            }
        }
    }

    if (extractedBits.length < 32) {
        throw new Error("未能在图片中检测到隐藏数据");
    }

    try {
        return bitsToText(extractedBits);
    } catch (e) {
        throw new Error("提取隐藏文字失败：" + e.message);
    }
}
