require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

// Email sender
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Auth middleware
async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "Missing token" });

    const token = header.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);

    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/* --------------------------------------------------
 1️⃣ Send verification link to child email
-------------------------------------------------- */
app.post("/api/send-child-verification-link", verifyToken, async (req, res) => {
  try {
    const { childEmail } = req.body;

    let childRecord;
    try {
      childRecord = await admin.auth().getUserByEmail(childEmail);
    } catch {
      return res.json({ childExists: false });
    }

    const childUid = childRecord.uid;

    // Create token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await db.collection("childVerificationTokens").doc(childUid).set({
      token,
      expiresAt,
      verified: false,
    });

    const link = `${process.env.CLIENT_URL}/child-verify?token=${token}&uid=${childUid}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: childEmail,
      subject: "Verify Parent Connection",
      html: `
        <p>Click below to approve parent linking:</p>
        <a href="${link}">Verify Parent Request</a>
        <p>This link expires in 10 minutes.</p>
      `,
    });

    res.json({ childExists: true, childUid });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------------------------------
 2️⃣ Child clicks on verification link
-------------------------------------------------- */
app.post("/api/verify-child-link", async (req, res) => {
  try {
    const { uid, token } = req.body;

    const ref = db.collection("childVerificationTokens").doc(uid);
    const snap = await ref.get();

    if (!snap.exists) return res.json({ error: "Invalid token" });

    const data = snap.data();

    if (data.token !== token) return res.json({ error: "Token mismatch" });

    if (Date.now() > data.expiresAt) return res.json({ error: "Expired token" });

    await ref.update({ verified: true });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------------------------------
 3️⃣ Parent checks verification status
-------------------------------------------------- */
app.get("/api/check-child-verification", verifyToken, async (req, res) => {
  try {
    const { uid } = req.query;

    const ref = db.collection("childVerificationTokens").doc(uid);
    const snap = await ref.get();

    if (!snap.exists) return res.json({ verified: false });

    res.json({ verified: snap.data().verified });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --------------------------------------------------
 4️⃣ Parent links child
-------------------------------------------------- */
app.post("/api/link-child", verifyToken, async (req, res) => {
  try {
    const parentUid = req.uid;
    const { childUid } = req.body;

    // Ensure child verified
    const tokenSnap = await db.collection("childVerificationTokens").doc(childUid).get();
    if (!tokenSnap.exists || !tokenSnap.data().verified) {
      return res.json({ error: "Child not verified yet" });
    }

    // Create parent doc if needed
    await db.collection("parents").doc(parentUid).set(
      {
        uid: parentUid,
        children: [],
      },
      { merge: true }
    );

    await db.collection("children").doc(childUid).set(
      {
        uid: childUid,
        parentUID: parentUid,
        linkedAt: Date.now(),
      },
      { merge: true }
    );

    await db.collection("parents").doc(parentUid).update({
      children: admin.firestore.FieldValue.arrayUnion(childUid),
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
