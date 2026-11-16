const https = require('https');
const fs = require('fs');

function getWikiThumb(title) {
  return new Promise((resolve) => {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500`;
    https.get(url, { headers: { 'User-Agent': 'EnglishKidApp/1.0 (contact: info@kidapp.local)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query.pages;
          const page = Object.values(pages)[0];
          resolve(page && page.thumbnail ? page.thumbnail.source : null);
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

const transportList = [
  { en: "Car", vi: "Ô tô con", emoji: "🚗", query: "Car", sentence: "We go to school by car!" },
  { en: "Bus", vi: "Xe buýt", emoji: "🚌", query: "Bus", sentence: "The big yellow bus is coming!" },
  { en: "Train", vi: "Tàu hỏa", emoji: "🚂", query: "Train", sentence: "The train goes choo choo!" },
  { en: "Airplane", vi: "Máy bay", emoji: "✈️", query: "Airplane", sentence: "The airplane flies in the sky!" },
  { en: "Bicycle", vi: "Xe đạp", emoji: "🚲", query: "Bicycle", sentence: "I ride my bicycle in the park." },
  { en: "Motorbike", vi: "Xe máy", emoji: "🏍️", query: "Motorcycle", sentence: "Dad rides a motorbike." },
  { en: "Fire truck", vi: "Xe cứu hỏa", emoji: "🚒", query: "Fire engine", sentence: "The red fire truck is fast!" },
  { en: "Police car", vi: "Xe cảnh sát", emoji: "🚓", query: "Police car", sentence: "Look! A police car!" },
  { en: "Ambulance", vi: "Xe cứu thương", emoji: "🚑", query: "Ambulance", sentence: "The ambulance helps sick people." },
  { en: "Ship", vi: "Tàu thủy", emoji: "🚢", query: "Cruise ship", sentence: "The big ship sails on the sea." },
  { en: "Helicopter", vi: "Trực thăng", emoji: "🚁", query: "Helicopter", sentence: "The helicopter can hover!" },
  { en: "Truck", vi: "Xe tải", emoji: "🚚", query: "Truck", sentence: "The truck carries heavy boxes." },
  { en: "Boat", vi: "Thuyền nhỏ", emoji: "⛵", query: "Sailboat", sentence: "The sailboat glides on the river." },
  { en: "Submarine", vi: "Tàu ngầm", emoji: "🤿", query: "Submarine", sentence: "The submarine dives deep under water." },
  { en: "Rocket", vi: "Tên lửa", emoji: "🚀", query: "Rocket", sentence: "3, 2, 1, rocket blast off!" },
  { en: "Scooter", vi: "Xe trượt scooter", emoji: "🛴", query: "Kick scooter", sentence: "I zoom around on my scooter." },
  { en: "Taxi", vi: "Xe taxi", emoji: "🚕", query: "Taxicab", sentence: "Wave your hand to call a taxi!" },
  { en: "Tractor", vi: "Xe máy cày", emoji: "🚜", query: "Tractor", sentence: "The green tractor works on the farm." },
  { en: "Van", vi: "Xe tải nhỏ van", emoji: "🚐", query: "Van", sentence: "The family travels in a big van." },
  { en: "Hot air balloon", vi: "Khinh khí cầu", emoji: "🎈", query: "Hot air balloon", sentence: "The colorful hot air balloon floats high." },
  { en: "Bulldozer", vi: "Xe ủi", emoji: "🚧", query: "Bulldozer", sentence: "The bulldozer pushes dirt away." },
  { en: "Crane", vi: "Xe cẩu", emoji: "🏗️", query: "Mobile crane", sentence: "The crane lifts heavy steel beams." }
];

async function main() {
  const verified = [];
  for (const item of transportList) {
    let thumb = await getWikiThumb(item.query);
    if (!thumb && item.query !== item.en) {
      thumb = await getWikiThumb(item.en);
    }
    verified.push({
      en: item.en,
      vi: item.vi,
      emoji: item.emoji,
      image: thumb || "",
      sentence: item.sentence
    });
    console.log(`${item.en} (${item.query}) -> ${thumb ? 'OK' : 'MISSING'}`);
  }

  const filePath = 'd:/antigravity/tieng_anh_cung_con/phuong_tien/index.html';
  const content = fs.readFileSync(filePath, 'utf-8');
  const newCall = `initTopicGame(${JSON.stringify(verified, null, 2)}, { questionSuffix: "là xe gì?" });`;
  const regex = /initTopicGame\([\s\S]*?\);\s*<\/script>/;
  const updated = content.replace(regex, `${newCall}\n  </script>`);
  fs.writeFileSync(filePath, updated, 'utf-8');
  console.log('Transportation updated successfully!');
}

main();

