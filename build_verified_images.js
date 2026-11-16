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
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

const dataset = {
  nuoi: [
    { en: "Cat", vi: "Con mèo", emoji: "🐱", query: "Cat", sentence: "It is a cute cat!" },
    { en: "Dog", vi: "Con chó", emoji: "🐶", query: "Dog", sentence: "Look! A happy dog!" },
    { en: "Duck", vi: "Con vịt", emoji: "🦆", query: "Mallard", sentence: "The duck says quack!" },
    { en: "Cow", vi: "Con bò", emoji: "🐮", query: "Cattle", sentence: "The cow gives us milk." },
    { en: "Pig", vi: "Con lợn", emoji: "🐷", query: "Domestic pig", sentence: "It is a pink pig!" },
    { en: "Chicken", vi: "Con gà", emoji: "🐔", query: "Chicken", sentence: "The chicken lays an egg." },
    { en: "Sheep", vi: "Con cừu", emoji: "🐑", query: "Sheep", sentence: "The sheep is white and soft." },
    { en: "Horse", vi: "Con ngựa", emoji: "🐴", query: "Horse", sentence: "The horse can run fast!" },
    { en: "Rabbit", vi: "Con thỏ", emoji: "🐰", query: "Domestic rabbit", sentence: "The rabbit has long ears!" },
    { en: "Goat", vi: "Con dê", emoji: "🐐", query: "Goat", sentence: "The goat likes green grass." },
    { en: "Mouse", vi: "Con chuột", emoji: "🐭", query: "House mouse", sentence: "The little mouse likes cheese." },
    { en: "Hamster", vi: "Chuột hamster", emoji: "🐹", query: "Golden hamster", sentence: "The hamster has chubby cheeks!" },
    { en: "Puppy", vi: "Chó con", emoji: "🐶", query: "Puppy", sentence: "The puppy is very playful." },
    { en: "Kitten", vi: "Mèo con", emoji: "🐱", query: "Kitten", sentence: "The kitten drinks warm milk." },
    { en: "Rooster", vi: "Gà trống", emoji: "🐓", query: "Rooster", sentence: "The rooster crows cock-a-doodle-doo!" },
    { en: "Chick", vi: "Gà con", emoji: "🐥", query: "Chick", sentence: "The yellow chick says peep peep!" },
    { en: "Goose", vi: "Con ngỗng", emoji: "🪿", query: "Domestic goose", sentence: "The white goose swims gracefully." },
    { en: "Turkey", vi: "Gà tây", emoji: "🦃", query: "Wild turkey", sentence: "The turkey has big feathers." },
    { en: "Donkey", vi: "Con lừa", emoji: "🫏", query: "Donkey", sentence: "The donkey carries heavy baskets." },
    { en: "Water buffalo", vi: "Con trâu", emoji: "🐃", query: "Water buffalo", sentence: "The water buffalo loves muddy water." }
  ],
  hoang_da: [
    { en: "Lion", vi: "Sư tử", emoji: "🦁", query: "Lion", sentence: "The lion is very strong!" },
    { en: "Tiger", vi: "Con hổ", emoji: "🐯", query: "Tiger", sentence: "The tiger has orange stripes." },
    { en: "Elephant", vi: "Con voi", emoji: "🐘", query: "Elephant", sentence: "The elephant is so big!" },
    { en: "Monkey", vi: "Con khỉ", emoji: "🐒", query: "Monkey", sentence: "The monkey likes bananas." },
    { en: "Giraffe", vi: "Hươu cao cổ", emoji: "🦒", query: "Giraffe", sentence: "The giraffe has a long neck!" },
    { en: "Zebra", vi: "Ngựa vằn", emoji: "🦓", query: "Zebra", sentence: "The zebra is black and white." },
    { en: "Bear", vi: "Con gấu", emoji: "🐻", query: "Brown bear", sentence: "The brown bear likes honey." },
    { en: "Fox", vi: "Con cáo", emoji: "🦊", query: "Red fox", sentence: "The fox is very clever." },
    { en: "Kangaroo", vi: "Chuột túi", emoji: "🦘", query: "Kangaroo", sentence: "The kangaroo can jump high!" },
    { en: "Panda", vi: "Gấu trúc", emoji: "🐼", query: "Giant panda", sentence: "The panda eats bamboo." },
    { en: "Crocodile", vi: "Cá sấu", emoji: "🐊", query: "Crocodile", sentence: "The crocodile has sharp teeth!" },
    { en: "Hippo", vi: "Hà mã", emoji: "🦛", query: "Hippopotamus", sentence: "The hippo swims in the river." },
    { en: "Rhino", vi: "Tê giác", emoji: "🦏", query: "Rhinoceros", sentence: "The rhino has a big horn." },
    { en: "Wolf", vi: "Chó sói", emoji: "🐺", query: "Wolf", sentence: "The wolf howls at the moon." },
    { en: "Deer", vi: "Con hươu", emoji: "🦌", query: "Red deer", sentence: "The deer runs quickly." },
    { en: "Camel", vi: "Lạc đà", emoji: "🐪", query: "Dromedary", sentence: "The camel walks in the desert." },
    { en: "Snake", vi: "Con rắn", emoji: "🐍", query: "Snake", sentence: "The green snake slithers quietly." },
    { en: "Gorilla", vi: "Khỉ đột", emoji: "🦍", query: "Western gorilla", sentence: "The gorilla beats its chest." },
    { en: "Koala", vi: "Gấu túi koala", emoji: "🐨", query: "Koala", sentence: "The cute koala sleeps on the tree." },
    { en: "Cheetah", vi: "Báo đốm", emoji: "🐆", query: "Cheetah", sentence: "The cheetah runs super fast!" }
  ],
  duoi_nuoc: [
    { en: "Fish", vi: "Con cá", emoji: "🐟", query: "Fish", sentence: "The fish swims in water." },
    { en: "Whale", vi: "Cá voi", emoji: "🐳", query: "Blue whale", sentence: "The whale is huge!" },
    { en: "Dolphin", vi: "Cá heo", emoji: "🐬", query: "Bottlenose dolphin", sentence: "The dolphin is friendly." },
    { en: "Shark", vi: "Cá mập", emoji: "🦈", query: "Shark", sentence: "Look out! It is a shark!" },
    { en: "Octopus", vi: "Bạch tuộc", emoji: "🐙", query: "Octopus", sentence: "The octopus has eight arms!" },
    { en: "Crab", vi: "Con cua", emoji: "🦀", query: "Crab", sentence: "The red crab walks sideways." },
    { en: "Turtle", vi: "Con rùa", emoji: "🐢", query: "Sea turtle", sentence: "The turtle swims slowly." },
    { en: "Frog", vi: "Con ếch", emoji: "🐸", query: "Frog", sentence: "The green frog can jump!" },
    { en: "Shrimp", vi: "Con tôm", emoji: "🦐", query: "Shrimp", sentence: "It is a little shrimp." },
    { en: "Jellyfish", vi: "Con sứa", emoji: "🪼", query: "Jellyfish", sentence: "The jellyfish glows in the sea." },
    { en: "Starfish", vi: "Sao biển", emoji: "⭐", query: "Starfish", sentence: "The starfish rests on the sand." },
    { en: "Seahorse", vi: "Cá ngựa", emoji: "🪸", query: "Seahorse", sentence: "The seahorse swims upright." },
    { en: "Squid", vi: "Con mực", emoji: "🦑", query: "Squid", sentence: "The squid squirts dark ink." },
    { en: "Seal", vi: "Hải cẩu", emoji: "🦭", query: "Harbor seal", sentence: "The seal claps its flippers." },
    { en: "Otter", vi: "Rái cá", emoji: "🦦", query: "Sea otter", sentence: "The otter floats on its back." },
    { en: "Lobster", vi: "Tôm hùm", emoji: "🦞", query: "Lobster", sentence: "The lobster has two big claws." },
    { en: "Clam", vi: "Con sò", emoji: "🦪", query: "Bivalvia", sentence: "The clam hides inside its shell." },
    { en: "Eel", vi: "Con lươn", emoji: "🐍", query: "Eel", sentence: "The eel looks like a snake." },
    { en: "Stingray", vi: "Cá đuối", emoji: "🌊", query: "Stingray", sentence: "The stingray glides like a bird." },
    { en: "Goldfish", vi: "Cá vàng", emoji: "🐠", query: "Goldfish", sentence: "The pretty goldfish swims in the bowl." }
  ],
  chim_con_trung: [
    { en: "Bird", vi: "Con chim", emoji: "🐦", query: "Bird", sentence: "The bird can fly high!" },
    { en: "Owl", vi: "Chim cú", emoji: "🦉", query: "Barn owl", sentence: "The owl wakes up at night." },
    { en: "Eagle", vi: "Đại bàng", emoji: "🦅", query: "Bald eagle", sentence: "The eagle flies in the sky." },
    { en: "Parrot", vi: "Con vẹt", emoji: "🦜", query: "Parrot", sentence: "The colorful parrot can talk!" },
    { en: "Penguin", vi: "Chim cánh cụt", emoji: "🐧", query: "Emperor penguin", sentence: "The penguin loves cold snow!" },
    { en: "Butterfly", vi: "Con bướm", emoji: "🦋", query: "Monarch butterfly", sentence: "What a pretty butterfly!" },
    { en: "Bee", vi: "Con ong", emoji: "🐝", query: "Western honey bee", sentence: "The busy bee makes honey." },
    { en: "Ant", vi: "Con kiến", emoji: "🐜", query: "Ant", sentence: "The little ant works hard." },
    { en: "Ladybug", vi: "Bọ rùa", emoji: "🐞", query: "Coccinellidae", sentence: "The ladybug has black spots." },
    { en: "Spider", vi: "Con nhện", emoji: "🕷️", query: "Spider", sentence: "The spider makes a web." },
    { en: "Swan", vi: "Thiên nga", emoji: "🦢", query: "Mute swan", sentence: "The graceful swan glides on the lake." },
    { en: "Flamingo", vi: "Hồng hạc", emoji: "🦩", query: "Flamingo", sentence: "The pink flamingo stands on one leg!" },
    { en: "Peacock", vi: "Con công", emoji: "🦚", query: "Peafowl", sentence: "The peacock shows its colorful tail." },
    { en: "Pigeon", vi: "Bồ câu", emoji: "🕊️", query: "Rock dove", sentence: "The pigeon brings peace." },
    { en: "Dragonfly", vi: "Chuồn chuồn", emoji: "🪰", query: "Dragonfly", sentence: "The dragonfly hovers over flowers." },
    { en: "Caterpillar", vi: "Sâu bướm", emoji: "🐛", query: "Caterpillar", sentence: "The hungry caterpillar crawls slowly." },
    { en: "Snail", vi: "Ốc sên", emoji: "🐌", query: "Cornu aspersum", sentence: "The snail carries its house." },
    { en: "Mosquito", vi: "Con muỗi", emoji: "🦟", query: "Mosquito", sentence: "Shoo! The mosquito is buzzing." },
    { en: "Grasshopper", vi: "Châu chấu", emoji: "🦗", query: "Grasshopper", sentence: "The green grasshopper jumps high." },
    { en: "Beetle", vi: "Bọ hung", emoji: "🪲", query: "Beetle", sentence: "The shiny beetle climbs on leaves." }
  ]
};

async function main() {
  const verifiedOutput = {};
  for (const [category, list] of Object.entries(dataset)) {
    console.log(`Processing category: ${category}...`);
    verifiedOutput[category] = [];
    for (const item of list) {
      let thumb = await getWikiThumb(item.query);
      if (!thumb && item.query !== item.en) {
        thumb = await getWikiThumb(item.en);
      }
      verifiedOutput[category].push({
        en: item.en,
        vi: item.vi,
        emoji: item.emoji,
        image: thumb || "",
        sentence: item.sentence
      });
      console.log(`  ${item.en} (${item.query}) -> ${thumb ? 'OK' : 'MISSING'}`);
    }
  }

  fs.writeFileSync('d:/antigravity/tieng_anh_cung_con/verified_animals.json', JSON.stringify(verifiedOutput, null, 2), 'utf-8');
  console.log('Done writing verified_animals.json');
}

main();

