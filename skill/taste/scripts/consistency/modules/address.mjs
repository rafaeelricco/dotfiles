// consistency/modules/address.mjs — the address check module (moved from consistency.mjs)
// ---------------------------------------------------------------- address: kept as one block
export const addressMod = (() => {
  // address.mjs: a real address, phone number or company number printed on the page (the publish review holds).
  //   contact    street-number (a street with its house number in the page's text, links or JSON-LD, FAIL),
  //              postcode (a postcode beside its town, or a UK, US, NL or PT code, FAIL), coordinates (map coordinates
  //              as decimals or degrees, or in a map link, FAIL), company-number (a register, VAT, tax or bank number,
  //              FAIL), phone-number (a number in a real dialable format, or a tel: link, FAIL)
  //
  // Why: the publish review held a test page for "Weserstraße 58, 12045 Berlin" (a real Berlin door, given as the bar's) and
  // another for "+354 555 0142" (a real-format Icelandic number). The skill's rule (SKILL.md 9, copy.md
  // "Address"): a street and a district only, no house number, postcode or coordinates; no register or VAT number; no
  // phone in a real format; contacts on .example. What the brief gives is printed as given: pass it with --address-allow.
  //
  // What it reads, once per width (a contact told at one width is not told again, unless it was hidden there and shows
  // at a later one, like a phone-only contact bar):
  //   - every text on the page, shown or hidden (a closed <details>, a tab panel, a slide not showing: a visitor opens
  //     it), joined per block the way it reads: a <br> or a new block breaks the line, and a row of short flex or grid
  //     items reads as one line (<span>Weserstraße</span><span>58</span>); SVG <text> counts (a drawn map's labels are
  //     printed too), and so do open shadow roots and same-origin frames. Only what shows gets a crop; a fixed or sticky
  //     bar is cropped on the first screen
  //   - the alt, aria-label, title and placeholder of every element, and the text a copy button gives (data-copy)
  //   - every link and frame: tel:, sms:, callto: and wa.me numbers, geo: and map links with coordinates in them
  //     (Google's embeds !2d..!3d.. too), every query value of a map, search or mailto: link (subject and body both,
  //     "?query=Weserstraße+58"), and Google's !1s, !2s and /maps/place/ names. A link finding quotes what was found
  //     in it and names the link's host
  //   - JSON-LD and microdata: postalCode, a streetAddress with a number, latitude and longitude, telephone and
  //     faxNumber, vatID, taxID, leiCode and duns
  // The rules, each FAIL (the builder removes it, or names the brief that gives it):
  //   street-number  a street name with its number after it (Weserstraße 58, Hauptstr. 12a, Karl-Marx-Straße 3,
  //                  Aðalstræti 48, Storgata 5, Karl Johans gate 22, Keizersgracht 123, Mannerheimintie 1, Rua Augusta
  //                  25, Via Roma 10) or before it (12 rue de Rivoli, 221B Baker Street, 1600 Pennsylvania Avenue)
  //   postcode       DE, FR and FI 5 digits, AT, CH, DK, NO and BE 4 digits beside a town, when the block names a street
  //                  (with or without its number) or sits in an <address> or a part named address, or when the line
  //                  holds only the code and the town (or a country) inside a part named contact, visit or location;
  //                  IS 3 digits beside an Icelandic town on its own line; SE 3+2 digits, PT 1234-567 and NL 1015 CJ with
  //                  a town; a UK postcode (SW1A 1AA), a US state with its ZIP (CA 94103), a country prefix (D-10115)
  //   coordinates    a decimal pair with 4 or more places (52.4875, 13.4310), degrees with minutes or 2 places and N/S
  //                  E/W (52°29′15″N 13°25′51″E), lat/lng labels, geo: links and map links with a pair in them
  //   company-number HRB/HRA, Amtsgericht, USt-IdNr, UID, VAT, TVA, MwSt, IVA, BTW, MVA, CVR, KvK, Org.nr, Kennitala,
  //                  SIREN/SIRET, RCS, NIF, ABN, EIN, Company No, Companies House, Steuernummer and IBAN with their
  //                  number, and an EU VAT id written alone (DE123456789, ATU12345678, GB123456789)
  //   phone-number   a tel: link; in text an international number (+354 555 0142, 0049 30 ...), a national number with
  //                  its trunk 0 and 9 or more digits (030 2345178, 020 3946 0018), a US number ((415) 555-2671), or any
  //                  7 or more digits after a label (Tel, Phone, Call, Teléfono, Sími, Puh, T: or T.) or inside a tel:
  //                  link or an itemprop telephone (a lone capital without its colon is no label: sizes S 34 36 M 38 40)
  // What passes (no false FAIL): a street or a district alone (Weserstraße, Berlin-Neukölln), .example contacts,
  // prices (€1,200, 21,500 kr), years and © lines, versions (v2.4.1), spec numbers (6 kg, 1,200 mm, 3.4 GHz), counts
  // (12,000 users, 650 people, a stat line "2500 Integrations"), times and opening hours (08:00-18:00, 07.30–19.00),
  // dates (02.11.2026, 05/2026), ISO and EN numbers, order and SKU numbers, numbers in a device mock. A number the
  // placeholder check already FAILs as a stand-in (zeros, one repeated digit, 1234567) and the numbers kept for fiction
  // (Ofcom's 020 7946 0xxx and 07700 900xxx, Australia's 0491 570 xxx, the US 555-01xx in its US shape: 555-0142, a US
  // area code or +1) pass: nobody answers them. 555 0142 without a dash, after +354 or after Sími is a real Icelandic
  // line and FAILs (the placeholder check's 555-01xx test should read +354 the same way).
  // Motion does not change the verdict (the words are the fault wherever they move to), so nothing is downgraded.
  // Flags: --address-allow "Weserstraße 58|+354 555 0142" (the contacts the brief gives, | between them: printed as given)
  // --no-address skips the module.

  const id = "address";
  const phase = "width";
  const checks = [
    { id: "street-number", sev: "FAIL", what: "a street with its house number" },
    { id: "postcode", sev: "FAIL", what: "a postcode in a common format, beside its town" },
    { id: "coordinates", sev: "FAIL", what: "map coordinates in text, a link or JSON-LD" },
    { id: "company-number", sev: "FAIL", what: "a company register, VAT, tax or bank number" },
    { id: "phone-number", sev: "FAIL", what: "a phone number in a real dialable format, or a tel: link" },
  ];
  const fixes = {
    "street-number":
      'print the street and the district only ("Weserstraße, Berlin-Neukölln"): no house number, unless the brief gives the address',
    postcode: "drop the postcode: the street and the district say where it is (copy.md, Address)",
    coordinates: "drop the coordinates: Get directions opens an OpenStreetMap search for the street and the district",
    "company-number":
      "drop the register, VAT or tax number: the legal row holds the brand, the year, Privacy, Terms and the credits line",
    "phone-number":
      'drop the number and its tel: link (a "Request a call" form may stand in), unless the brief gives the number',
  };
  const flags = [
    {
      name: "address-allow",
      kind: "value",
      default: "",
      help: "the contacts the brief gives, | between them (printed as given, not told)",
    },
  ];
  const summary = [
    "  contact    street-number (a street with its house number in the page's text, links or JSON-LD, FAIL),",
    "             postcode (a postcode beside its town, or a UK, US, NL or PT code, FAIL), coordinates (map coordinates",
    "             as decimals or degrees, or in a map link, FAIL), company-number (a register, VAT, tax or bank number,",
    '             FAIL), phone-number (a number in a real dialable format, or a tel: link, FAIL); --address-allow "a|b"',
    "             passes what the brief gives",
  ].join("\n");

  // what was told at which width of this run (cleared at the first width): a contact is told once per page, and at a
  // later width only when it was hidden where it was told (a phone-only contact bar). key -> { width, shown }; a width
  // that runs again (the host retries a width that walked no screens) first forgets what it told itself
  let told = new Map();

  // ---------------------------------------------------------------- the matcher: plain JavaScript, sent into the page
  // scan(t, o) returns [{ check, at, len, what, key, why }] for one string. o.addr: inside an <address> or a part named
  // address, postal or zip; o.near: inside a part named contact, visit or location; o.tel: inside a tel: link or an
  // itemprop telephone; o.field: a JSON-LD or microdata key (the value is judged by its key); o.href: the string is a link.
  function scan(t, o = {}) {
    const out = [],
      taken = [];
    const digits = s => String(s).replace(/\D/g, "");
    const norm = s =>
      String(s)
        .toLowerCase()
        .normalize("NFC")
        .replace(/[\s.,'’\-–\/()+:]/g, "");
    const free = (a, b) => !taken.some(([x, y]) => a < y && b > x);
    const add = (check, at, what, key, why) => {
      const lead = what.length - what.trimStart().length;
      what = what.trim();
      at += lead;
      if (!what || !free(at, at + what.length)) return false;
      taken.push([at, at + what.length]);
      out.push({ check, at, len: what.length, what, key: check + ":" + key, why });
      return true;
    };
    // a number nobody answers: the placeholder check's stand-ins, and the ranges kept for drama and fiction
    const stand = d => /0{5,}/.test(d) || /(\d)\1{5,}/.test(d) || /1234567|7654321/.test(d);
    // (raw: the number as written, so +354 555 0142 is read as Icelandic, never as a US area code 354. The US 555-01xx
    // counts only in its US shape: 555-0142 or 555.0142, with a US area code, or after +1, and never after a Nordic
    // label: 555 0142 is a real Icelandic line, and Sími 555 0142 is one)
    const fiction = (d, raw, nordic) => {
      const s = String(raw || ""),
        intl = /^\s*(?:\+|00)/.test(s),
        c = intl ? d.replace(/^00/, "") : d;
      if (intl && !/^(1|44|61)/.test(c)) return false;
      const n =
        intl ?
          c[0] === "1" ?
            c.slice(1)
          : "0" + c.slice(2)
        : d;
      const us =
        !nordic
        && (intl ?
          c[0] === "1" && /^[2-9]\d{2}55501\d\d$/.test(n)
        : /^[2-9]\d{2}55501\d\d$/.test(n) || (/^55501\d\d$/.test(n) && /555[.\-]01\d\d/.test(s)));
      return (
        us // the US 555-0100 to 0199
        || /^0(?:2079460|1[1-6]\d4960|1[1-6]14960|1214960|1314960|1414960|1514960|1614960|2896496|2920180|1632960|7700900|8081570|9098790|3069990)\d+$/.test(
          n,
        ) // Ofcom's drama numbers
        || /^04915(?:70|71|72)\d{3}$/.test(n)
        || /^0[2378](?:5550|7010)\d{4}$/.test(n)
      ); // Australia's fiction numbers
    };
    const dialable = (d, raw, nordic) => d.length >= 7 && d.length <= 15 && !stand(d) && !fiction(d, raw, nordic);
    const ll = (a, b) => {
      const x = parseFloat(String(a).replace("−", "-")),
        y = parseFloat(String(b).replace("−", "-"));
      return Math.abs(x) <= 90 && Math.abs(y) <= 180 && !(Math.abs(x) < 1 && Math.abs(y) < 1);
    };
    const UNIT =
      /^\s?(?:%|‰|°|[€$£¥]|kr\.?(?![\p{L}])|km|mi|min|kg|cm|mm|ml|cl|m²|m|h|g|t|l|s|x|px|ms|fps|Hz|kHz|MHz|GHz|mAh|kWh|Wh|kW|W|V|GB|MB|TB|Uhr|pm|am|PS|hp)(?![\p{L}])/u;
    const CUR = /(?:[€$£¥₹]|\bkr\.?|\bEUR|\bUSD|\bGBP|\bCHF|\bISK|\bNOK|\bSEK|\bDKK)\s?$/;
    const yearish = n => /^(19|20)\d\d$/.test(n);

    // ---- a JSON-LD or microdata value, judged by its key
    if (o.field) {
      const k = String(o.field).toLowerCase(),
        v = String(t).trim();
      if (!v) return out;
      if (k === "postalcode") add("postcode", 0, v, norm(v), "a postalCode");
      else if (k === "streetaddress") {
        if (/\d/.test(v)) add("street-number", 0, v, norm(v), "a streetAddress with a house number");
      } else if (k === "latitude" || k === "longitude") {
        if (/\d+[.,]\d{2,}/.test(v)) add("coordinates", 0, v, norm(v).slice(0, 6), "map coordinates (" + o.field + ")");
      } // (keyed by the value: an allowed "Georgstraße 5" holds "geo")
      else if (k === "telephone" || k === "faxnumber") {
        const d = digits(v);
        if (dialable(d, v)) add("phone-number", 0, v, d, "a " + o.field + " in a real dialable format");
      } else if (/^(vatid|taxid|leicode|duns|iso6523code|globallocationnumber)$/.test(k)) {
        if (digits(v).length >= 5) add("company-number", 0, v, digits(v), "a " + o.field);
      } else if (/^(hasmap|url|sameas|map)$/.test(k)) return scan(v, { href: true });
      else return scan(v, {});
      return out;
    }

    // ---- a link: the number of a tel: link, the pairs of a map link, the words of a mailto: or a search query. What is
    // quoted is what was found in it (the pair, the number, the street), and the link's host is named after it
    if (o.href) {
      const h = String(t).trim();
      const inLink =
        ", in a link ("
        + ((h.match(/^https?:\/\/([^\/?#]+)/i) || [])[1] || h.replace(/[?#].*$/, "").slice(0, 40))
        + ")";
      let m;
      if (
        (m = h.match(/^(?:tel|sms|callto|facetime(?:-audio)?):\s*(.+)$/i))
        || (m = h.match(/^https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\/?\?phone=)\/?(\+?\d[\d%-]{6,})/i))
      ) {
        const wa = /^https?:/i.test(h);
        let raw = m[1];
        try {
          raw = decodeURIComponent(raw);
        } catch {}
        raw = wa ? "+" + digits(raw) : raw.replace(/^[^\d+]*/, "").replace(/[?;].*$/, "");
        const d = digits(raw);
        if (dialable(d, raw))
          add(
            "phone-number",
            0,
            h,
            d,
            wa ?
              "a WhatsApp link calls a number in a real dialable format"
            : "a " + h.match(/^[a-z-]+/i)[0].toLowerCase() + ": link calls a number in a real dialable format",
          );
        return out;
      }
      if ((m = h.match(/^geo:\s*([-+]?\d{1,2}(?:\.\d+)?),\s*([-+]?\d{1,3}(?:\.\d+)?)/i))) {
        if (ll(m[1], m[2]))
          add("coordinates", 0, m[0], norm(m[1].slice(0, 6) + m[2].slice(0, 6)), "a geo: link holds map coordinates");
        return out;
      }
      let dec = h;
      try {
        dec = decodeURIComponent(h.replace(/\+/g, " "));
      } catch {}
      const pair = (lat, lng, at, what) => {
        if (ll(lat, lng))
          add(
            "coordinates",
            at,
            what,
            norm(lat.slice(0, 6) + lng.slice(0, 6)),
            "a link holds map coordinates" + inLink,
          );
      };
      // Google's embeds and place links write the pair backwards (!2d<lng>!3d<lat>); the others lat first (@52.48,13.42,
      // ?mlat=..&mlon=.., !3d..!4d.., a route of two pairs: each is told)
      for (const x of dec.matchAll(/!2d([-+]?\d{1,3}\.\d{4,})!3d([-+]?\d{1,2}\.\d{4,})/g))
        pair(x[2], x[1], x.index, x[0]);
      for (const x of dec.matchAll(/([-+]?\d{1,2}\.\d{4,})\s*(?:,|~|\/|!4d|&m?lo?n=|&lng=)\s*([-+]?\d{1,3}\.\d{4,})/g))
        pair(x[1], x[2], x.index, x[0]);
      // the words: every query value a map, a search or a mail can hold (subject and body both), Google's !1s and !2s
      // place names and a /maps/place/ path
      const parts = [
        ...dec.matchAll(
          /[?&#;](?:q|query|daddr|saddr|destination|origin|address|ll|text|subject|body|cc|bcc)=([^&#]*)/gi,
        ),
        ...dec.matchAll(/![12]s([^!]+)/g),
        ...dec.matchAll(/\/maps\/(?:place|search|dir)\/([^@?#]+)/gi),
      ];
      for (const x of parts) {
        const base = x.index + x[0].length - x[1].length;
        for (const y of scan(x[1].replace(/\//g, "\n"), {}))
          add(y.check, base + y.at, y.what, y.key.slice(y.check.length + 1), y.why + inLink);
      }
      return out;
    }

    // ---- printed text
    // a company register, VAT, tax or bank number with its label, and an EU VAT id written alone
    const REG =
      /(?<![\p{L}\d])(HRB|HRA|Amtsgericht\s+\p{Lu}[\p{L}-]+,?\s*(?:HRB|HRA)?|Handelsregister(?:nummer)?|Registernummer|Registergericht\s+\p{Lu}[\p{L}-]+,?\s*(?:HRB|HRA)?|USt\.?\s?-?\s?Id(?:\.?\s?-?\s?Nr)?\.?|Umsatzsteuer-?(?:Identifikationsnummer|ID)|UID(?:-Nr\.?)?|VAT(?:\s?(?:ID|Id|No\.?|no\.?|number|Number|Reg(?:istration)?\.?(?:\s?No\.?)?))?|TVA(?:\s?intracommunautaire)?|N°\s?TVA|MwSt\.?-?Nr\.?|IVA|P\.?\s?IVA|Partita\s+IVA|BTW(?:-?nummer)?|Momsnr\.?|MVA|Steuer-?Nr\.?|Steuernummer|St\.?-?Nr\.?|Tax\s?(?:ID|Id|No\.?|number|Number)|TIN|EIN|ABN|ACN|NIF|NIPC|CIF|SIRET|SIREN|RCS(?:\s+\p{Lu}\p{L}+)?|KvK(?:-?nummer)?|CVR(?:-?nr\.?)?|Org\.?\s?-?nr\.?|Organisasjonsnummer|Organisationsnummer|Y-tunnus|Kennitala|Company\s+(?:No\.?|Number|number|Reg(?:istration)?\.?\s?(?:No\.?|Number|number))|Registered\s+(?:in\s+\p{Lu}\p{L}+(?:\s+and\s+\p{Lu}\p{L}+)?\s+)?(?:under\s+)?(?:No\.?|Number|number|no\.?)|Companies\s+House(?:\s+No\.?)?|Firmenbuch(?:nummer)?|FN|ZVR(?:-Zahl)?|UEN|CRN|IBAN)\s*[:#.]?\s*(?:No\.?|Nr\.?|n°)?\s*([A-Z]{0,4}[\s-]?\d[\d\s.\/-]{2,}\d(?:\s?[A-Z]{1,3}(?![\p{L}]))?)/dgu;
    for (const m of t.matchAll(REG)) {
      const n = digits(m[2]);
      if (n.length >= (/^HR[AB]|^Amtsgericht|^Registergericht/.test(m[1]) ? 3 : 6) && !/^(19|20)\d\d$/.test(n))
        add(
          "company-number",
          m.index,
          m[0],
          n,
          /IBAN/.test(m[1]) ? "a bank account (IBAN)"
          : /VAT|TVA|MwSt|IVA|BTW|Moms|MVA|USt|Umsatz|UID/i.test(m[1]) ? "a VAT number"
          : /Steuer|St\.?-?Nr|Tax|TIN|EIN|NIF|NIPC|CIF/i.test(m[1]) ? "a tax number"
          : "a company register number",
        );
    }
    const VAT =
      /(?<![\p{L}\d])(?:ATU\d{8}|BE0\d{9}|DE\d{9}|DK\d{8}|FI\d{8}|FR[0-9A-HJ-NP-Z]{2}\d{9}|GB\d{9}(?:\d{3})?|IE\d{7}[A-W][A-IW]?|IT\d{11}|NL\d{9}B\d{2}|PT\d{9}|SE\d{10}01|ES[A-Z\d]\d{7}[A-Z\d]|LU\d{8}|PL\d{10}|CHE-?\d{3}\.\d{3}\.\d{3}(?:\s?(?:MWST|TVA|IVA))?|NO\d{9}MVA)(?![\p{L}\d])/gu;
    for (const m of t.matchAll(VAT)) add("company-number", m.index, m[0], digits(m[0]), "a VAT number");

    // map coordinates: a decimal pair, degrees with minutes or two places, a lat/lng label
    for (const m of t.matchAll(
      /(?<![\d.,\w€$£])([-+−]?\d{1,2}\.\d{4,})°?\s*[NS]?\s*,\s*([-+−]?\d{1,3}\.\d{4,})°?\s*[EWO]?(?!\d|\.\d)/g,
    ))
      if (ll(m[1], m[2]))
        add("coordinates", m.index, m[0], norm(m[1].slice(0, 6) + m[2].slice(0, 6)), "map coordinates");
    for (const m of t.matchAll(
      /(?<![\d.])(\d{1,2}(?:[.,](\d+))?)\s*°\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*['′’]\s*(?:\d{1,2}(?:[.,]\d+)?\s*(?:["″”]|'')\s*)?)?([NS])[\s,;\/]*(\d{1,3}(?:[.,](\d+))?)\s*°\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*['′’]\s*(?:\d{1,2}(?:[.,]\d+)?\s*(?:["″”]|'')\s*)?)?([EWO])(?![\p{L}])/gu,
    )) {
      if ((m[3] && m[7]) || ((m[2] || "").length >= 2 && (m[6] || "").length >= 2))
        add("coordinates", m.index, m[0], norm(m[0]), "map coordinates");
    }
    for (const m of t.matchAll(/\b(?:lat(?:itude)?|lng|lon(?:gitude)?)\s*[:=]?\s*[-+]?\d{1,3}\.\d{3,}/gi))
      add("coordinates", m.index, m[0], norm(m[0]), "map coordinates");

    // phone numbers: international, a US number, a national one with its trunk 0, any after a label
    const before = (at, n = 24) => t.slice(Math.max(0, at - n), at);
    // a label before the number: a word (any case), or a capital letter with its colon or stop (T: P. M: F:), never a
    // lone letter (the sizes S 34 36 M 38 40 are no phone)
    const labelled = at =>
      o.tel
      || /(?:^|[^\p{L}])(?:tel|tlf|tlfn|phone|telephone|call(?:\s+us)?(?:\s+on|\s+at)?|ring(?:\s+us)?(?:\s+on)?|fon|telefon|telefoon|téléphone|tél|tel[eé]fono|telefone|sími|simi|puh|puhelin|mob|mobile|mobil|cell|handy|whatsapp|fax|hotline)\.?\s*[:.]?\s*$/iu.test(
        before(at),
      )
      || /(?:^|[\s(|·•])[TPMF]\s?[:.]\s*$/.test(before(at));
    // a Nordic label: 5xx xxxx after it is a real Icelandic line, not the US 555-01xx
    const nordic = at => /(?:^|[^\p{L}])(?:sími|simi|símanúmer|puh|puhelin|tlf|tlfn)\.?\s*[:.]?\s*$/iu.test(before(at));
    const notNumber = m =>
      CUR.test(before(m.index, 6))
      || UNIT.test(t.slice(m.index + m[0].length))
      || (!labelled(m.index)
        && /(?:ISBN|ISSN|EAN|GTIN|SKU|Art\.?|Nr\.?|No\.?|Order|Invoice|Ref\.?|ID|Kunden|Rechnung|#)\s*[:.]?\s*$/i.test(
          before(m.index, 14),
        ))
      || /^\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4}$/.test(m[0].trim())
      || /^\d{1,2}[.:]\d{2}(?:\s?[-–]\s?\d{1,2}[.:]\d{2})?$/.test(m[0].trim());
    const phone = (m, d, why) => {
      if (!notNumber(m) && dialable(d, m[0], nordic(m.index))) add("phone-number", m.index, m[0], d, why);
    };
    for (const m of t.matchAll(/(?<![\w+\d])(?:\+|00)\s?\(?[1-9]\d{0,2}\)?(?:[\s.\-\/]?\(?\d{1,5}\)?){2,6}(?!\d)/g)) {
      const d = digits(m[0]).replace(/^00/, "");
      if (
        d.length >= 8
        && (m[0].trim()[0] === "+" || d.length >= 10)
        && !/^\+\d{1,3}(?:[\s.]\d{3})+$/.test(m[0].trim())
      )
        phone(m, d, "a phone number in international format");
    } // (+12 000 000 downloads is a count)
    for (const m of t.matchAll(
      /(?<![\w\d])(?:\+?1[\s.\-])?(?:\([2-9]\d{2}\)\s?|[2-9]\d{2}[.\-])[2-9]\d{2}[.\-]\d{4}(?![\d\w])/g,
    ))
      phone(m, digits(m[0]), "a US phone number");
    for (const m of t.matchAll(
      /(?<![\w\d.,+\/-])(?:\(0\d{1,4}\)\s?|0\d{1,4}(?:\s?\/\s?|[\s.\-]))\d{2,8}(?:[\s.\-]\d{2,8}){0,3}(?![\d\w]|[.,]\d)/g,
    )) {
      const d = digits(m[0]);
      if (d.length >= 9 && d.length <= 12) phone(m, d, "a phone number with its area code");
    }
    for (const m of t.matchAll(/(?<![\w\d.,+\/-])\(?\d{2,4}\)?(?:[\s.\-]?\d{2,4}){1,4}(?![\d\w]|[.,]\d)/g)) {
      const d = digits(m[0]);
      if (d.length >= 7 && d.length <= 13 && labelled(m.index)) phone(m, d, "a phone number after its label");
    }

    // a street with its house number: the number after the name (Germanic, Nordic, Dutch, Romance) or before it
    // (English, French); never a year, a unit or a range of minutes after it
    const NUM = String.raw`(?:Nr\.?\s*|No\.?\s*|nr\.?\s*|n\.?\s?º\s?|nº\s?|n°\s?)?(\d{1,4}(?:[a-zA-Z](?![\p{L}]))?(?:\s?[-–\/]\s?\d{1,4}[a-zA-Z]?)?)`; // (the house letter sits on the number, 58a: "5 m" stays a unit)
    const GUARD = String.raw`(?![\d]|[.,:]\d|\s?(?:%|‰|°|[€$£]|kr\.?|km|mi|min|kg|cm|mm|ml|m|h|g|t|l|s|x|Uhr|pm|am|Jahre|years|Minuten|minutes)(?![\p{L}]))`;
    const FOLLOW = String.raw`(?=\s*$|\s*[,.;:)\]\n]|\s+(?:\d|\p{Lu}))`;
    const SUF =
      "straße|strasse|str\\.|gasse|allee|weg|damm|ufer|platz|steig|chaussee|pfad|zeile|gürtel|kai|stieg|graben|straat|laan|gracht|kade|plein|singel|dijk|steeg|gatan|gata|gaten|gade|vej|vegen|veien|vei|vägen|väg|gränd|torget|torg|plads|plass|backen|stigen|katu|kuja|tie|stræti|stígur|vegur|braut";
    const SHORT = {
      weg: 4,
      kai: 4,
      tie: 5,
      vei: 4,
      vej: 4,
      torg: 4,
      laan: 4,
      kade: 4,
      dijk: 4,
      väg: 4,
      gata: 4,
      gade: 4,
      katu: 4,
      kuja: 4,
    };
    const NOTSTREET =
      /^(park|sitz|stell|arbeits|spiel|liege|start|zelt|camping|steh|abstell|rast|steck|bau|bahn|flug|heim|rück|aus|um|wander|rund|lehr|rad|fuß|fuss|schul|lebens|hin|weiter|sieger)$/i;
    const STOPLEAD =
      /^(auf|der|die|das|den|dem|ein|eine|einen|unser|unsere|mein|meine|dein|ihr|ihre|kein|erster|zweiter|letzter|the|a|an|our|your|on|in|im|am|at|to|zum|zur|vom|von|bis|ab)$/i;
    const streetNo = (m, name, no, why) => {
      if (yearish(digits(no)) && digits(no) === no.trim()) return;
      add("street-number", m.index, m[0], norm(name) + norm(no), why);
    };
    for (const m of t.matchAll(
      new RegExp(
        String.raw`(?<![\p{L}\d])((?:\p{Lu}[\p{Ll}\p{M}ß]*-)*)(\p{Lu}[\p{Ll}\p{M}ß]*?)(${SUF})\s+${NUM}${GUARD}`,
        "gu",
      ),
    )) {
      if (m[2].length < (SHORT[m[3]] || 3) || NOTSTREET.test(m[2])) continue;
      streetNo(m, m[1] + m[2] + m[3], m[4], "a street with its house number");
    }
    for (const m of t.matchAll(
      new RegExp(
        String.raw`(?<![\p{L}\d])((?:\p{Lu}[\p{L}\p{M}]*[-\s]){1,3})(Straße|Strasse|Str\.|Allee|Weg|Platz|Gasse|Damm|Ufer|Chaussee|Steig|Straat|Laan|Gracht|Kade|Plein|Singel)\s+${NUM}${GUARD}`,
        "gu",
      ),
    )) {
      if (
        m[1]
          .trim()
          .split(/[-\s]+/)
          .some(w => STOPLEAD.test(w))
      )
        continue;
      streetNo(m, m[1] + m[2], m[3], "a street with its house number");
    }
    for (const m of t.matchAll(
      new RegExp(
        String.raw`(?<![\p{L}\d])((?:\p{Lu}[\p{L}\p{M}]*\s){1,3})(gate|gata|gaten|gatan|vei|veien|vej|gade|plass|plads|allé|vegur|stræti|vägen|väg)\s+${NUM}${GUARD}`,
        "gu",
      ),
    ))
      streetNo(m, m[1] + m[2], m[3], "a street with its house number");
    // a Romance street's number ends the line or stands before a postcode ("Via Stripe 3D Secure" is no Via Roma 10)
    const ENDS = String.raw`(?=\s*$|\s*[,.;:)\]\n]|\s+\d{4,5}(?!\d))`;
    const PART = String.raw`(?:(?:d[aeo]s?|del|de|dei|della|delle|degli|di|do|la|las|los|el|l['’]|y|e)\s+)?`;
    for (const m of t.matchAll(
      new RegExp(
        String.raw`(?<![\p{L}])(Rua|Avenida|Av\.|Travessa|Largo|Praça|Calçada|Estrada|Alameda|Calle|Carrer|Avinguda|Paseo|Passeig|Plaza|Plaça|Ronda|Via|Viale|Piazza|Piazzale|Corso|Vicolo|Strada|Rue|Boulevard|Avenue)\s+(${PART}\p{Lu}[\p{L}\p{M}'’.-]*(?:\s+${PART}\p{Lu}[\p{L}\p{M}'’.-]*){0,3}),?\s+${NUM}${GUARD}${ENDS}`,
        "gu",
      ),
    ))
      streetNo(m, m[1] + m[2], m[3], "a street with its house number");
    for (const m of t.matchAll(
      new RegExp(
        String.raw`(?<![\p{L}\d#.,\/-])(\d{1,4}(?:\s?(?:bis|ter|[a-dA-D]))?),?\s+(?:(?:rue|avenue|av\.|boulevard|bd|place|quai|allée|impasse|chemin|cours|passage|route|square)\s+(?:(?:de\s+la|de\s+l['’]|du|des|de|d['’]|la|le|les)\s*)?|(?:Rue|Avenue|Av\.|Boulevard|Bd|Place|Quai|Allée|Impasse|Chemin|Cours|Passage|Route|Square)\s+(?:de\s+la|de\s+l['’]|du|des|de|d['’])\s*|(?:Rue|Quai|Allée|Impasse)\s+)\p{Lu}[\p{L}\p{M}'’-]*`,
        "gu",
      ),
    )) {
      if (UNIT.test(t.slice(m.index + m[1].length)) || CUR.test(before(m.index, 6))) continue;
      streetNo(m, m[0].slice(m[1].length), m[1], "a street with its house number");
    }
    const MID =
      /^(day|days|hour|hours|minute|minutes|min|week|weeks|month|months|year|years|step|steps|second|seconds|wheel|star|stars|time|times|point|points|people|seat|seats|room|rooms|guest|guests|team|teams|user|users|bed|beds|floor|floors|course|courses|mile|miles|pack|piece|pieces|part|parts|phase|stage|level|lap|ways|simple|easy|quick|fast|more|new|best|top|key|great|good|small|big|one|two|three|of|and|or|the)$/i;
    for (const m of t.matchAll(
      new RegExp(
        String.raw`(?<![\p{L}\d#.,\/-])(\d{1,5}[A-Za-z]?(?:[-–]\d{1,5})?),?\s+((?:\p{Lu}[\p{L}\p{M}'’.-]*\s+){1,3})(Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Lane|Ln\.?|Drive|Dr\.?|Boulevard|Blvd\.?|Place|Pl\.?|Square|Sq\.?|Terrace|Crescent|Close|Court|Ct\.?|Way|Parade|Mews|Row|Gardens|Grove|Wharf|Quay|Highway|Hwy\.?|Parkway|Pkwy\.?|Circle|Trail|Plaza|Embankment|Hill)(?![\p{L}])${FOLLOW}`,
        "gu",
      ),
    )) {
      if (
        m[2]
          .trim()
          .split(/\s+/)
          .some(w => MID.test(w.replace(/[.'’-]/g, "")))
        || CUR.test(before(m.index, 6))
      )
        continue;
      streetNo(m, m[2] + m[3], m[1], "a street with its house number");
    }
    const hasStreet = out.some(x => x.check === "street-number");
    // a street named without its number in the same block ("Weserstraße" on the line above "12045 Berlin")
    const bareStreet = new RegExp(
      String.raw`(?<![\p{L}\d])(?:\p{Lu}[\p{Ll}\p{M}ß-]{2,}(?:${SUF})|\p{Lu}[\p{L}\p{M}]+[-\s](?:Straße|Strasse|Str\.|Allee|Weg|Platz|Gasse|Damm|Ufer|Chaussee|gate|gata|vei|vej|gade|Straat|Laan|Gracht|Kade|Plein|Street|Road|Lane|Avenue|Drive|Square|Terrace|Crescent)|(?:Rua|Avenida|Calle|Carrer|Via|Viale|Piazza|Corso|Rue|Boulevard|Avenue)\s+(?:(?:d[aeo]s?|de|del|della|la|du)\s+)?\p{Lu}[\p{L}\p{M}]+)(?![\p{L}])`,
      "u",
    ).test(t);

    // postcodes: the formats with letters or a dash stand on their own; a plain number beside a town counts when the
    // block holds a street (with or without its number) or the part is named for an address, or when the line holds
    // only the code and the town inside a part named contact, visit or location (a stat line "2500 Integrations" or
    // "Join 4000 Founders" is none of these)
    const TOWN = String.raw`(\p{Lu}[\p{Ll}\p{M}'’]+(?:(?:[-\s](?:am|an|im|in|der|den|die|bei|ob|sur|sous|lès|les|de|la|le|aan|op|upon|on)){0,2}[-\s]\p{Lu}[\p{Ll}\p{M}'’]+){0,2}(?:\s(?:[A-ZÆØÅ])(?![\p{L}]))?|\p{Lu}{4,}(?:[-\s]\p{Lu}{2,}){0,2})`;
    const STOPWORD = new Set(
      "users customers clients people persons guests rooms beds seats tables members teams companies brands partners reviews ratings stars points steps downloads installs developers engineers students visitors readers subscribers followers fans orders items products pieces units models series edition editions collection version release update pro plus max mini ultra lite air watts watt lumens lux volts amps calories kcal words pages lines commits repos repositories servers nodes requests events transactions invoices records rows files hours days weeks months years minutes seconds miles meters metres kilometres kilometers feet euro euros dollars dollar pounds kronor kroner krónur francs uhr mal times shots photos images frames fps rpm gb mb tb hz mhz ghz mah iso open opens closed nights night liters litres bags cups beans kunden gäste zimmer plätze mitglieder nutzer besucher stück sterne punkte jahre tage stunden minuten kilometer meter nächte liter gäster rum gjester rom personer år dagar dager dage gestir herbergi ár nætur monday tuesday wednesday thursday friday saturday sunday mon tue tues wed thu thur thurs fri sat sun montag dienstag mittwoch donnerstag freitag samstag sonntag mo di mi do fr sa so january february march april may june july august september october november december jan feb mar apr jun jul aug sep sept oct nov dec januar februar märz mai juni juli oktober dezember km mm cm kg ft sq m2 cad bc ad bce ce utc gmt cet cest edt est pst integrations integration restaurants cafes cafés bars roasters founders makers creators employees staff mitarbeiter mitarbeitende countries cities stores shops outlets locations venues apps tools plugins templates businesses farms farmers growers producers suppliers bakers baristas cups bottles bags kilos tonnes tons lbs coffees beers wines dishes recipes meals bookings reservations tickets stays hosts homes houses flats apartments projects länder städte filialen standorte läden betriebe tassen flaschen kaffees lots batches origins".split(
        " ",
      ),
    );
    const townOk = w => w && !w.split(/[-\s]+/).some(x => STOPWORD.has(x.toLowerCase()));
    // the line that holds the match (split at a line break and at , ; | · • – — and brackets) holds nothing else but an
    // address label or a country ("12045 Berlin Germany"; "Our 3200 Roasters" holds more)
    const alone = (at, len) => {
      let a = at,
        b = at + len;
      while (a > 0 && !/[\n,;|·•–—()]/.test(t[a - 1])) a--;
      while (b < t.length && !/[\n,;|·•–—()]/.test(t[b])) b++;
      const rest = (t.slice(a, at) + " " + t.slice(at + len, b)).trim();
      return (
        !rest
        || /^(?:address|adresse|anschrift|adres|osoite|heimilisfang|indirizzo|morada|dirección)\s*:?$/i.test(rest)
        || /^(?:Germany|Deutschland|Austria|Österreich|Switzerland|Schweiz|Suisse|Svizzera|Iceland|Ísland|Norway|Norge|Sweden|Sverige|Denmark|Danmark|Finland|Suomi|Netherlands|Nederland|Belgium|België|Belgique|France|Italy|Italia|Spain|España|Portugal|Luxembourg|DE|AT|CH|IS|NO|SE|DK|FI|NL|BE|FR|IT|ES|PT|LU)$/u.test(
          rest,
        )
      );
    };
    const PRE =
      /(?:#|No\.?|Nr\.?|Art\.?|ISO|EN|DIN|IP|IEC|Model|Typ|Type|Serie|Series|Room|Zimmer|Suite|Gate|Bus|Route|Linie|Line|Flight|Pier|Studio|Platform|Gleis|since|seit|est\.?|founded|gegründet|©|\(c\)|Copyright)\s*$/i;
    const LB = String.raw`(?<![\p{L}\d.,:\/+\-–—#])`; // (after a dash it ends a range: ca. 1386–1347 BCE)
    const post = (m, at, code, town, why) =>
      add(
        "postcode",
        at,
        m[0].slice(at - m.index),
        digits(code) + (town ? norm(town.split(/[-\s]/)[0]) : code.replace(/\d|\s/g, "").toLowerCase()),
        why,
      );
    // a country prefix (D-10115 Berlin, CH-8001): a single letter needs its town
    for (const m of t.matchAll(
      new RegExp(
        String.raw`(?<![\p{L}\d-])(CH|DK|SE|FI|FIN|NL|IS|NO|PT|ES|IT|D|A|F|B|L|I|S|N|P|E)-\s?(\d{4,5}|\d{3}\s\d{2})(?![\d])(?:[ \t\u00a0]+${TOWN})?`,
        "gu",
      ),
    ))
      if (m[1].length > 1 || (m[3] && townOk(m[3]))) post(m, m.index, m[2], m[3], "a postcode with its country prefix");
    // UK and US: their own shapes
    for (const m of t.matchAll(
      /(?<![A-Za-z\d])(?:[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]?|GIR) \d[ABD-HJLNP-UW-Z]{2}(?![A-Za-z\d])/g,
    ))
      add("postcode", m.index, m[0], norm(m[0]), "a UK postcode");
    for (const m of t.matchAll(
      /(?<![A-Za-z])(?:AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s+\d{5}(?:-\d{4})?(?!\d)/g,
    ))
      add("postcode", m.index, m[0], norm(m[0]), "a US state and ZIP code");
    // in a mock (an invoice, a dashboard) or a stat and spec row (2400 Lumen, 4000 Bookings, 2026-041 Draft) a bare number
    // needs an address beside it, and a round figure (4000, 12000) is a count before it is a postcode
    const ctx = o.addr || hasStreet || bareStreet,
      soft = !!(o.mock || o.stat),
      round = code => /00$/.test(code);
    // PT 1100-148 Lisboa, SE 111 22 Stockholm, NL 1015 CJ Amsterdam
    for (const m of t.matchAll(new RegExp(String.raw`${LB}(\d{4}-\d{3})(?!\d)(?:[ \t\u00a0]+${TOWN})?`, "gu"))) {
      if (yearish(m[1].slice(0, 4)) && !(o.addr || hasStreet)) continue; // 2026-041: a year and a serial, an invoice or a ticket
      if (
        PRE.test(before(m.index, 12))
        || /(?:invoice|rechnung|order|ticket|ref|nr|no|id|#)\.?\s*[:#]?\s*$/i.test(before(m.index, 14))
      )
        continue;
      if (ctx || (!soft && m[2] && townOk(m[2]) && (o.near || alone(m.index, m[0].length))))
        post(m, m.index, m[1], m[2], "a Portuguese postcode");
    }
    for (const m of t.matchAll(new RegExp(String.raw`${LB}([1-9]\d{2}\s\d{2})(?!\d)[ \t\u00a0]+${TOWN}`, "gu")))
      if (townOk(m[2]) && (!soft || ctx) && !PRE.test(before(m.index, 12)))
        post(m, m.index, m[1], m[2], "a Swedish postcode with its town");
    for (const m of t.matchAll(
      new RegExp(
        String.raw`${LB}([1-9]\d{3}\s?(?!SA|SD|SS|MB|GB|TB|KB|HD|UK|US|EU|AD|BC|AM|PM|KM|CM|MM|KG|HP|PS|KW|MW|GW|XL|ML|OK|CE|NM|FT|DB)[A-Z]{2})(?![\p{L}\d])(?:[ \t\u00a0]+${TOWN})?`,
        "gu",
      ),
    ))
      if (((m[2] && townOk(m[2]) && !soft) || ctx) && !yearish(m[1].slice(0, 4)) && !PRE.test(before(m.index, 12)))
        post(m, m.index, m[1], m[2], "a Dutch postcode");
    // 5 digits (DE, FR, FI, IT, ES), 4 digits (AT, CH, DK, NO, BE, LU), 3 digits (IS) beside a town
    for (const [len, why] of [
      [5, "a postcode with its town"],
      [4, "a postcode with its town"],
      [3, "an Icelandic postcode with its town"],
    ]) {
      for (const m of t.matchAll(new RegExp(String.raw`${LB}(\d{${len}})[ \t\u00a0]+${TOWN}`, "gu"))) {
        const code = m[1],
          town = m[2];
        if (
          !townOk(town)
          || PRE.test(before(m.index, 12))
          || CUR.test(before(m.index, 6))
          || /^\s?[+%]/.test(t.slice(m.index + code.length))
        )
          continue;
        const solo = alone(m.index, m[0].length);
        if (len === 4 && yearish(code) && !(o.addr || hasStreet)) continue;
        if (
          len === 3
          && !(
            o.addr
            || hasStreet
            || (solo
              && !soft
              && /[ðþæøåöáéíóúýÐÞÆØÅÖÁÉÍÓÚÝ]|(?:fjörður|vík|bær|ós|höfn|staðir|nes|eyri|ey|dalur|holt|hólmur|fell)$/.test(
                town,
              ))
          )
        )
          continue;
        if (len !== 3 && !(ctx || (solo && o.near && !soft))) continue;
        post(m, m.index, code, town, why);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- the in-page probe: every string the page holds
  // returns one entry per match, in page order: { check, key, what, why, sel, where, doc }. Hidden words are read too (a
  // closed <details>, a tab panel or a slide not showing: a visitor opens it); only what shows gets a box (doc) to crop.
  // Web components' open shadow roots and same-origin frames are read like the page
  function probe(scan) {
    // the parent, across a shadow root's edge to its host
    const up = e => e.parentElement || (e.parentNode && e.parentNode.host) || null;
    const sel = el => {
      const parts = [];
      for (let e = el; e && e.nodeType === 1 && !/^(BODY|HTML)$/.test(e.tagName) && parts.length < 4; e = up(e)) {
        const tag = e.tagName.toLowerCase();
        if (e.id && /^[A-Za-z][\w-]*$/.test(e.id)) {
          parts.unshift(tag + "#" + e.id);
          break;
        }
        const cls = [...e.classList].filter(c => /^[A-Za-z_][\w-]*$/.test(c) && !/^(is|js|has)-/.test(c)).slice(0, 2);
        let s = tag + cls.map(c => "." + c).join("");
        const p = e.parentElement;
        if (p) {
          const same = [...p.children].filter(x => x.tagName === e.tagName);
          if (same.length > 1 && (!cls.length || same.filter(x => cls.every(c => x.classList.contains(c))).length > 1))
            s += `:nth-of-type(${same.indexOf(e) + 1})`;
        }
        parts.unshift(s);
      }
      return parts.join(" > ");
    };
    const css = new Map(),
      seenEl = new Map(),
      pin = new Map(),
      rows = new Map();
    const cs = e => {
      if (!css.has(e)) css.set(e, (e.ownerDocument.defaultView || window).getComputedStyle(e));
      return css.get(e);
    };
    const shown = e => {
      if (!seenEl.has(e))
        seenEl.set(
          e,
          e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : e.getClientRects().length > 0,
        );
      return seenEl.get(e);
    };
    // a fixed or sticky bar (a top bar with the phone, a hide-on-scroll header) is boxed where the first screen shows it,
    // not where the walk left the page
    const pinned = e => {
      if (!e || e.nodeType !== 1 || e === document.documentElement) return false;
      if (!pin.has(e)) {
        const p = cs(e).position;
        pin.set(e, p === "fixed" || p === "sticky" || pinned(up(e)));
      }
      return pin.get(e);
    };
    const D = (r, e) =>
      r && r.width >= 1 && r.height >= 1 ?
        {
          left: Math.round(r.left),
          top: Math.round(r.top + (e && pinned(e) ? 0 : scrollY)),
          width: Math.round(r.width),
          height: Math.round(r.height),
        }
      : null;
    // a row of short items side by side (a flex row or a one-line grid of words: <span>Weserstraße</span><span>58</span>)
    // reads as one line, its items joined by an en space; a column, or items holding blocks or pictures, stay apart.
    // (a code and a town in two items are not read as a postcode: that is how a stat row sets "2500" beside "Regulars")
    const leaf = c =>
      c.textContent.length <= 120
      && !c.querySelector("img, svg, canvas, video, picture, iframe")
      && [...c.querySelectorAll("*")].every(d => {
        const x = cs(d).display;
        return x.startsWith("inline") || x === "contents" || x === "none";
      });
    const row = p => {
      if (!p || p.nodeType !== 1) return false;
      if (!rows.has(p)) {
        const kids = [...p.children];
        let ok =
          /^(inline-)?(flex|grid)$/.test(cs(p).display) && kids.length >= 2 && kids.length <= 12 && kids.every(leaf);
        if (ok) {
          const rs = kids.map(k => k.getBoundingClientRect()).filter(r => r.height > 0);
          ok = !rs.length || Math.max(...rs.map(r => r.top)) < Math.min(...rs.map(r => r.bottom));
        }
        rows.set(p, ok);
      }
      return rows.get(p);
    };
    const inline = e => {
      const p = e.parentElement;
      if (p && row(p)) return true;
      const d = cs(e).display;
      if (!d.startsWith("inline") && d !== "contents") return false;
      return !(p && /flex|grid/.test(cs(p).display));
    };
    const ADDR = /address|adress|adresse|postal|postcode|zip|plz|anschrift/i,
      NEAR = /contact|kontakt|visit|location|standort|impressum|imprint|find-?us|getting-?here/i;
    const named = (e, re, n) => {
      for (let x = e, i = 0; x && x.tagName !== "BODY" && i < n; x = x.parentElement, i++)
        if (
          re.test(
            ((typeof x.className === "string" ? x.className : x.getAttribute("class")) || "")
              + " "
              + (x.id || "")
              + " "
              + (x.getAttribute("itemprop") || ""),
          )
        )
          return true;
      return false;
    };
    // (a phone context is a tel: link or an itemprop telephone only: a class named phone is as often a device mock)
    // a stat, spec or figure row holds counts (4000 Bookings, 2400 Lumen), never an address on its own
    const STAT =
      /(?:^|[\s_-])(?:stats?|statistics?|specs?|specifications?|metrics?|kpis?|figures?|numbers?|counters?|counts?|facts?|tally|data-?row)(?:[\s_-]|$)/i;
    const ctxOf = e => ({
      addr: !!e.closest('address, [itemtype*="PostalAddress" i]') || named(e, ADDR, 4),
      near: named(e, NEAR, 6),
      tel: !!e.closest('a[href^="tel:" i], [itemprop~="telephone" i]'),
      mock: !!e.closest(
        'svg, [data-ui], .ui, [data-ui-loop], [data-m-loop], [data-diagram], [data-big-scene], [data-scene], [class*="mock" i]',
      ),
      stat: named(e, STAT, 4),
    });
    const where = e =>
      e.closest("svg") ? "on a drawn picture"
      : e.closest("[data-ui], .ui") ? "in a product mock"
      : "";
    const out = [];
    const push = (hits, el, extra, boxOf) => {
      for (const h of hits) {
        if (out.length >= 300) return;
        out.push({
          check: h.check,
          key: h.key,
          what: h.what.replace(/\s+/g, " ").slice(0, 80),
          why: h.why,
          sel: el ? sel(el) : extra.sel,
          where: [el ? where(el) : "", extra.where || ""].filter(Boolean).join(", "),
          doc: boxOf ? boxOf(h) : null,
        });
      }
    };

    // the page's words, block by block: inline text joins up, a <br> or another block between two runs breaks the line
    const blocks = new Map(),
      roots = [[document, null]];
    let last = null;
    const ownerOf = p => {
      if (p.closest("svg")) return [p.closest("text") || p, null];
      let e = p,
        item = null;
      while (e.parentElement && e.tagName !== "BODY" && inline(e)) {
        if (row(e.parentElement)) item = e;
        e = e.parentElement;
      }
      return [e, item];
    };
    const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TEXTAREA|SELECT|IFRAME|OBJECT|title|desc)$/;
    const walkText = (root, frame) => {
      const tw = (root.ownerDocument || root).createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: n =>
          n.nodeType === 1 ?
            SKIP.test(n.tagName) ?
              2
            : 1
          : n.nodeValue.trim() ? 1
          : 3,
      });
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (n.nodeType === 1) {
          if (n.shadowRoot) {
            roots.push([n.shadowRoot, frame]);
            walkText(n.shadowRoot, frame);
          }
          if (n.tagName === "BR" && n.parentElement) {
            const [o] = ownerOf(n.parentElement);
            const b = blocks.get(o);
            if (b) {
              b.text += "\n";
              b.pieces.push({ node: null, start: b.text.length - 1 });
            }
          }
          continue;
        }
        const p = n.parentElement;
        if (!p) continue;
        const [o, item] = ownerOf(p);
        let b = blocks.get(o);
        if (!b) blocks.set(o, (b = { text: "", pieces: [], frame, item: null }));
        if (last && last !== o && b.text && !b.text.endsWith("\n")) {
          b.text += "\n";
          b.pieces.push({ node: null, start: b.text.length - 1 });
        } else if (item && b.item && item !== b.item && b.text && !/\s$/.test(b.text)) {
          b.text += " ";
          b.pieces.push({ node: null, start: b.text.length - 1 });
        }
        b.item = item;
        b.pieces.push({ node: n, start: b.text.length, shown: shown(p) });
        b.text += n.nodeValue.replace(/\s/g, " ");
        last = o;
      }
    };
    walkText(document.body, null);
    // same-origin frames (a cross-origin one gives null and is read by its src only)
    for (const [r] of roots.slice())
      for (const f of r.querySelectorAll("iframe")) {
        let d = null;
        try {
          d = f.contentDocument;
        } catch {}
        if (d && d.body) {
          roots.push([d, f]);
          last = null;
          walkText(d.body, f);
        }
      }
    for (const [o, b] of blocks) {
      if (!/\d/.test(b.text)) continue;
      const hits = scan(b.text, ctxOf(o));
      push(hits, b.frame || o, b.frame ? { where: "in its frame" } : {}, h => {
        if (b.frame) return shown(b.frame) ? D(b.frame.getBoundingClientRect(), b.frame) : null;
        // the box of the matched words themselves (a Range over the text nodes they sit in), else the block's; none
        // when the words are hidden
        const at = i => {
          let p = null;
          for (const x of b.pieces) {
            if (x.start > i) break;
            if (x.node) p = x;
          }
          return p;
        };
        const a = at(h.at),
          z = at(h.at + h.len - 1);
        if (!a || !a.shown || !shown(o)) return null;
        if (z) {
          try {
            const rg = document.createRange();
            rg.setStart(a.node, Math.min(a.node.length, Math.max(0, h.at - a.start)));
            rg.setEnd(z.node, Math.min(z.node.length, h.at + h.len - z.start));
            const r = D(rg.getBoundingClientRect(), o);
            if (r) return r;
          } catch {}
        }
        return D(o.getBoundingClientRect(), o);
      });
    }
    const boxOf = (e, frame) => () =>
      frame ?
        shown(frame) ? D(frame.getBoundingClientRect(), frame)
        : null
      : shown(e) ? D(e.getBoundingClientRect(), e)
      : null;
    for (const [r, frame] of roots) {
      // what the page says in attributes, shown or not: alt, aria-label, title, placeholder, and the text a copy
      // button puts on the clipboard
      for (const e of r.querySelectorAll(
        "[alt], [aria-label], [title], [placeholder], [data-copy], [data-clipboard-text]",
      )) {
        if (/^(HTML|HEAD|TITLE|LINK|META|SCRIPT|STYLE)$/.test(e.tagName)) continue;
        for (const at of ["alt", "aria-label", "title", "placeholder", "data-copy", "data-clipboard-text"]) {
          const v = e.getAttribute(at);
          if (v && /\d/.test(v))
            push(
              scan(v, ctxOf(e)),
              frame || e,
              { where: /^data-/.test(at) ? "in the text its copy button gives" : `in its ${at}` },
              boxOf(e, frame),
            );
        }
      }
      // links and frames, shown or not (a hidden tel: link is still on the page)
      for (const e of r.querySelectorAll("a[href], area[href], iframe[src]")) {
        const h = e.getAttribute("href") || e.getAttribute("src") || "";
        if (
          !/^(tel|sms|callto|facetime|geo|mailto):|wa\.me|whatsapp|[?&#](q|query|daddr|saddr|destination|address|ll|text|subject|body|mlat|map)=|@-?\d{1,2}\.\d|!3d|!2d|maps|openstreetmap|osm\.org/i.test(
            h,
          )
        )
          continue;
        push(
          scan(h, { href: true }),
          frame || e,
          {
            where:
              e.tagName === "IFRAME" ? "in its frame"
              : frame ? "in its frame"
              : "",
          },
          boxOf(e, frame),
        );
      }
      // structured data: JSON-LD blocks and microdata with a content attribute, judged by their keys
      const walk = (v, k, hits) => {
        if (Array.isArray(v)) v.forEach(x => walk(x, k, hits));
        else if (v && typeof v === "object")
          for (const [kk, vv] of Object.entries(v)) {
            if (!kk.startsWith("@")) walk(vv, kk, hits);
          }
        else if ((typeof v === "string" || typeof v === "number") && k) hits.push(...scan(String(v), { field: k }));
      };
      for (const s of r.querySelectorAll('script[type="application/ld+json" i]')) {
        let j;
        try {
          j = JSON.parse(s.textContent);
        } catch {
          continue;
        }
        const hits = [];
        walk(j, "", hits);
        push(hits, frame, { sel: 'script[type="application/ld+json"]', where: "in the JSON-LD" });
      }
      for (const e of r.querySelectorAll("[itemprop][content]")) {
        const k = e.getAttribute("itemprop");
        push(scan(e.getAttribute("content"), { field: k }), frame || e, { where: "in its microdata" }, boxOf(e, frame));
      }
    }
    // the page's head: its title and the descriptions a search result or a shared link prints (meta description, og:,
    // twitter:); read with no context, so a street with its number makes the postcode beside it count
    {
      const hd = [];
      if (document.title && /\d/.test(document.title)) hd.push(["<title>", document.title]);
      for (const m of document.querySelectorAll("meta[content]")) {
        const k = (
          m.getAttribute("name")
          || m.getAttribute("property")
          || m.getAttribute("itemprop")
          || ""
        ).toLowerCase();
        if (
          /^(description|og:|twitter:|dc\.|geo\.|place:|business:|contact)/.test(k)
          && /\d/.test(m.getAttribute("content"))
        )
          hd.push([`<meta ${k}>`, m.getAttribute("content")]);
      }
      for (const [k, v] of hd.slice(0, 40))
        push(scan(v, /^<meta (geo|place|business:contact)/.test(k) ? { addr: true } : {}), null, {
          sel: "head",
          where: k,
        });
    }
    return out;
  }

  // ---------------------------------------------------------------- the check
  async function run(ctx) {
    if (ctx.first) told = new Map();
    for (const [k, v] of told) if (v.width === ctx.width) told.delete(k); // (this width runs again: what it told is told again)
    const list =
      (await ctx.safe("address", () => ctx.tab.eval(`(${probe.toString()})(${scan.toString()})`, 60000))) || [];
    // what the brief gives passes: --address-allow "Weserstraße 58|+354 555 0142" (matched without spaces or marks)
    const flat = s =>
      String(s)
        .toLowerCase()
        .normalize("NFC")
        .replace(/[\s.,'’\-–\/()+:]/g, "");
    const allow = String(ctx.flags["address-allow"] || "")
      .split("|")
      .map(flat)
      .filter(x => x.length >= 3);
    const given = x =>
      allow.some(a => {
        const w = flat(x.what),
          k = flat(x.key.split(":").slice(1).join(":"));
        const d = x.what.replace(/\D/g, "");
        return (
          (w && a.includes(w))
          || (k.length >= 3 && a.includes(k))
          || (x.check === "phone-number" && d.length >= 7 && a.replace(/\D/g, "").endsWith(d.slice(-7)))
        );
      });
    // one finding per contact (the same address printed in the footer and on the map is told once, the others named),
    // and one per element (a second number in the same block is named in the first one's finding). A contact told at
    // another width is told here only when it was hidden there and shows here (then with its crop)
    const groups = new Map();
    for (const x of list) {
      if (given(x)) continue;
      if (!groups.has(x.key)) groups.set(x.key, []);
      groups.get(x.key).push(x);
    }
    const byEl = new Map();
    for (const [key, g0] of groups) {
      const g = [...g0.filter(y => y.doc), ...g0.filter(y => !y.doc)]; // (the first place it shows leads)
      const t = told.get(key);
      if (t && (t.shown || !g[0].doc)) continue;
      const k = g[0].check + "|" + g[0].sel;
      if (!byEl.has(k)) byEl.set(k, { key, first: g, before: t, also: [] });
      else byEl.get(k).also.push({ key, x: g[0] });
    }
    const clamp = r => {
      const left = Math.max(0, Math.min(ctx.vw - 4, r.left)),
        right = Math.max(left + 4, Math.min(ctx.vw, r.left + r.width));
      return {
        left,
        top: Math.max(0, r.top),
        width: right - left,
        height: Math.max(2, Math.min(ctx.vh - Math.max(0, r.top), r.height)),
      };
    };
    const SAID = {
      "street-number": "a real door, which the brief does not give",
      postcode: "with the street it points at one building, which the brief does not give",
      coordinates: "they point at one building on a map",
      "company-number": "it names a real company, or says one is registered that is not",
      "phone-number": "a visitor can dial it and reach a stranger",
    };
    const F = [],
      per = {};
    for (const { key, first: g, before, also } of byEl.values()) {
      const x = g[0];
      if ((per[x.check] = (per[x.check] || 0) + 1) > 8) continue; // (past 8 a check is not told here, so not marked told)
      const others = [
        ...new Set(
          g.slice(1).map(y => (y.sel === x.sel ? y.where || "again here" : y.sel + (y.where ? " " + y.where : ""))),
        ),
      ];
      const named = also.slice(0, 3);
      const f = { check: x.check, sev: "FAIL", id: 0, sel: x.sel, text: x.what.slice(0, 40) };
      // the crop: the first place the page shows it (a hidden link, a closed part or the JSON-LD has none)
      if (x.doc) {
        const p = ctx.place(x.doc);
        if (p.stop != null && p.rects.length) Object.assign(f, { stop: p.stop, rects: p.rects.map(clamp) });
      }
      const hidden =
        !x.doc && !/JSON-LD|microdata|<title>|<meta /.test(x.where) ?
          " (not shown at this width: a closed part, a tab, a slide or a hidden link)"
        : "";
      f.msg =
        `${x.why}${x.where ? " " + x.where : ""}: "${x.what.slice(0, 40)}"; ${SAID[x.check]}${hidden}`
        + (before ? ` (told at ${before.width} where it did not show)` : "")
        + (named.length ? ` (and in the same element: ${named.map(y => `"${y.x.what.slice(0, 32)}"`).join(", ")})` : "")
        + (others.length ?
          ` (and ${others.length} more like it: ${others.slice(0, 3).join(", ")}${others.length > 3 ? ", ..." : ""})`
        : "");
      // what became a finding is told: its contact, and the ones its message names
      for (const k of [key, ...named.map(y => y.key)]) told.set(k, { width: ctx.width, shown: f.stop != null });
      F.push(f);
    }
    ctx.log(`${list.length} matches, ${F.length} findings`);
    return F;
  }
  return { id, phase, checks, fixes, summary, flags, run };
})();
