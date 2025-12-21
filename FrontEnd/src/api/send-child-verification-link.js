app.post("/api/send-child-verification-code", verifyIdTokenFromHeader, async (req, res) => {
  try {
    const { childEmail } = req.body;

    if (!childEmail) return res.status(400).json({ error: "childEmail required" });

    // Check if child exists
    let childRecord;
    try {
      childRecord = await admin.auth().getUserByEmail(childEmail);
    } catch {
      return res.json({ childExists: false });
    }

    const childUid = childRecord.uid;

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to Firestore
    await db.collection("childVerificationCodes").doc(childUid).set({
      code: verificationCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 10 * 60 * 1000 
    });

    // Email the code
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: childEmail,
      subject: "Your Verification Code",
      html: `
        <p>Someone is trying to link your account to a parent.</p>
        <p>Your verification code is:</p>
        <h2>${verificationCode}</h2>
        <p>This code expires in 10 minutes.</p>
      `
    });

    return res.json({
      childExists: true,
      childUid,
      sent: true
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
