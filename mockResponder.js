// mockResponder.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

const db = JSON.parse(fs.readFileSync(path.join(__dirname, './accounts.json'), 'utf8'));

app.post('/vop/v1/respond', (req, res) => {
  const { party, partyAccount } = req.body;

  const name = party?.name;
  const identification = party?.identification?.organisationId;
  const iban = partyAccount?.iban;

  if (!iban || (!name && !identification)) {
    return res.status(400).json({
      type: 'input_error',
      code: 'MISSING_PARTY_DATA',
      message: 'Either name or identification with IBAN must be provided.'
    });
  }

  if (name) {
    // NATURAL PERSON MATCHING
    const found = db.individuals.find(ind => ind.iban === iban);
    if (!found) {
      return res.json({ partyNameMatch: 'NOAP' });
    }
    const nameLower = name.toLowerCase();
    const foundLower = found.name.toLowerCase();
    if (nameLower === foundLower) {
      return res.json({ partyNameMatch: 'MTCH' });
    } else if (foundLower.includes(nameLower) || nameLower.includes(foundLower)) {
      return res.json({ partyNameMatch: 'CMTC', matchedName: found.name });
    } else {
      return res.json({ partyNameMatch: 'NMTC' });
    }
  } else if (identification) {
    // LEGAL PERSON MATCHING
    const id = identification.lei || identification.anyBIC || identification.others?.[0]?.identification;
    const found = db.institution.find(inst => inst.iban === iban);
    if (!found) {
      return res.json({ partyIdMatch: 'NOAP' });
    }
    if (found.identification === id) {
      return res.json({ partyIdMatch: 'MTCH' });
    } else {
      return res.json({ partyIdMatch: 'NMTC' });
    }
  } else {
    return res.status(400).json({
      type: 'input_error',
      code: 'INSUFFICIENT_DATA',
      message: 'Could not determine party type from request.'
    });
  }
});

app.listen(4000, () => {
  console.log('✅ Mock Responder PSP running at http://localhost:4000/vop/v1/respond');
});