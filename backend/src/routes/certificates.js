const express = require('express');
const { getCertificates, saveCertificates } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');
const { logAudit } = require('../services/audit');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all certificates
router.get('/', authMiddleware, async (req, res) => {
  try {
    const certs = await getCertificates();
    res.json(certs);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve certificates' });
  }
});

// Create certificate
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, issuer, commonName, sans, validFrom, validTo, expiryDaysWarning, files } = req.body;
    
    if (!name || !commonName || !validFrom || !validTo) {
      return res.status(400).json({ error: 'Missing required certificate details' });
    }

    const certs = await getCertificates();
    
    const newCert = {
      id: uuidv4(),
      name,
      issuer: issuer || 'Unknown Issuer',
      commonName,
      sans: sans || [],
      validFrom,
      validTo,
      expiryDaysWarning: parseInt(expiryDaysWarning) || 30,
      files: files || [],
      createdAt: new Date().toISOString()
    };

    certs.push(newCert);
    await saveCertificates(certs);

    // Audit log
    await logAudit(
      req.user.username, 
      'CREATE_CERTIFICATE', 
      `Added SSL Certificate for ${commonName} (${name})`
    );

    res.status(201).json(newCert);
  } catch (e) {
    res.status(500).json({ error: 'Failed to add certificate' });
  }
});

// Update certificate
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, issuer, commonName, sans, validFrom, validTo, expiryDaysWarning, files } = req.body;
    
    const certs = await getCertificates();
    const index = certs.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const updatedCert = {
      ...certs[index],
      name: name || certs[index].name,
      issuer: issuer || certs[index].issuer,
      commonName: commonName || certs[index].commonName,
      sans: sans || certs[index].sans,
      validFrom: validFrom || certs[index].validFrom,
      validTo: validTo || certs[index].validTo,
      expiryDaysWarning: expiryDaysWarning !== undefined ? parseInt(expiryDaysWarning) || 30 : certs[index].expiryDaysWarning,
      files: files || certs[index].files
    };

    certs[index] = updatedCert;
    await saveCertificates(certs);

    // Audit log
    await logAudit(
      req.user.username, 
      'UPDATE_CERTIFICATE', 
      `Updated SSL Certificate for ${updatedCert.commonName} (${updatedCert.name})`
    );

    res.json(updatedCert);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update certificate' });
  }
});

// Delete certificate
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const certs = await getCertificates();
    const index = certs.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const removed = certs[index];
    certs.splice(index, 1);
    await saveCertificates(certs);

    // Audit log
    await logAudit(
      req.user.username, 
      'DELETE_CERTIFICATE', 
      `Deleted SSL Certificate for ${removed.commonName} (${removed.name})`
    );

    res.json({ message: 'Certificate deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
});

module.exports = router;
