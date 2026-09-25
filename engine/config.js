// engine/config.js — where things are. The one file a deployment edits.
// INSTANCE-OWNED: Blood & Other Drugs (merge=ours; see campaign/PLAN.md).
window.VttConfig = {
  system: 'vtm5e',
  title: 'Blood & Other Drugs',
  channel: 'blood-vtt',                  // BroadcastChannel name (same-machine windows)
  storagePrefix: 'blood-vtt',            // localStorage key prefix
  dataGlobal: 'VTM5E',                   // the global data/*.js registers into
  // The pages, relative to the site root; the gm/ pages carry <base href="../"> so every
  // path stays root-relative.
  pages: { site: './', gm: 'gm/', table: 'gm/vtt.html', play: 'gm/play.html', maps: 'gm/maps.html' },
  // what a fresh browser opens on until a campaign is created or restored.
  // An instance may add `seed: 'campaign/pack/seed.json'` — a pack whose keys fill what its
  // campaign has never had (its arc, its threads), once (engine/state.js seed).
  // An instance may also name the Notes pane's document (system/vtm5e/gm-panes.js):
  //   notes: { src: 'campaign/docs/state.html', title: '…', class: '…',
  //            gate: { title: '…', text: '…', enter: 'Enter' } }
  // a .html src is the instance's own fragment, inserted as it is; anything else reads as Markdown.
  defaultCampaign: { name: 'Blood & Other Drugs', modules: [], books: [] },
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
  // What this instance adds to the upstream pages (engine/instance.js). The campaign's DSL
  // layer — its cast — is built by build/build_layer.sh into campaign/data/:
  //   bash build/build_layer.sh campaign/dsl campaign "Blood & Other Drugs" campaign/data
  instance: {
    styles: ['campaign/site/campaign.css'],
    stages: {
      data: ['campaign/data/index.js'],
      // the chronicle's own tabs, ahead of the books (PLAN.md M3): its prose, then the tabs
      site: ['campaign/data/docs.js', 'campaign/data/map.js', 'campaign/site/site.js'],
      gm: [], table: [], play: [], maps: [],
    },
  },
  // The family standards (PLAYBOOK §4b; upstream V11), carried by hand because this file is the
  // instance's own (merge=ours): the public site shows the chronicle's tabs and the dice, the
  // books' tabs are the Storyteller's to turn on per browser in the GM page's Settings; a veil
  // stands in front of /gm/ for a player who wanders in.
  siteBooks: false,
  gmGate: {
    title: 'The Storyteller\u2019s table',
    text: 'Beyond is the Storyteller\u2019s material for Blood & Other Drugs \u2014 the prep, the threads, what the coterie has not yet found. If you are playing, turn back.',
    enter: 'Enter',
    leave: 'Turn back',
  },
  // The Worker that holds player sessions. Served from localhost the app talks to
  // `wrangler dev`; deployed, to the URL below. Empty = sessions disabled until the owner
  // deploys (PLAN.md D3).
  worker: {
    deployed: 'https://blood-and-other-drugs.sortilege.workers.dev',
    local: 'http://localhost:8795',
  },
};
window.VttConfig.workerUrl = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? window.VttConfig.worker.local : window.VttConfig.worker.deployed;
