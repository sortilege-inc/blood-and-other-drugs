// engine/config.js — where things are. The one file a deployment edits.
window.VttConfig = {
  system: 'vtm5e',
  title: 'Vampire: The Masquerade',
  channel: 'sortilege-vtt-vtm5e',        // BroadcastChannel name (same-machine windows)
  storagePrefix: 'sortilege-vtt-vtm5e',  // localStorage key prefix
  dataGlobal: 'VTM5E',                   // the global data/*.js registers into
  // The pages, relative to the site root; the gm/ pages carry <base href="../"> so every
  // path stays root-relative.
  pages: { site: './', gm: 'gm/', table: 'gm/vtt.html', play: 'gm/play.html' },
  // what a fresh browser opens on until a campaign is created or restored
  defaultCampaign: { name: 'A new chronicle', modules: ['chronicle'], books: [] },
  // the three panels the GM page opens on (engine/app.js)
  defaultSlots: ['chronicle', 'party', 'inspector'],
  // What an instance adds to these pages (engine/instance.js). Upstream declares none, so
  // every stage tag is a no-op here; a campaign repo forked from this VTT owns engine/config.js
  // and fills this in. Its DSL layer is built by build/build_layer.sh into its own data folder.
  //
  //   instance: {
  //     styles: ['campaign/site/campaign.css'],
  //     stages: {
  //       data:  ['campaign/data/index.js'],   // every page, after the books' index and records
  //       site:  ['campaign/site/site.js'],    // push tabs onto window.VttSiteTabs
  //       gm:    ['campaign/site/gm.js'],      // window.VttPanels.register(id, {label, render, count})
  //       table: [], play: [],                 // the map table's and the player's page, before they boot
  //     },
  //   },
  instance: null,
  // The Worker that holds player sessions. Served from localhost the app talks to
  // `wrangler dev`; deployed, to the URL below. Empty = sessions disabled until the owner
  // deploys (PLAN.md D3).
  worker: {
    deployed: '',
    local: 'http://localhost:8789',
  },
};
window.VttConfig.workerUrl = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? window.VttConfig.worker.local : window.VttConfig.worker.deployed;
