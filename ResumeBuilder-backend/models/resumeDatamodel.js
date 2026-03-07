import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

const resumeSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    shared: [{ 
        email: { type: String, required: true, index: true },
        name: { type: String, required: true },
        profilePicture: { type: String, default: null }
    }],
    owner: { type: String, required: true, index: true }, 
    selectedTemplate: { type: String, default: 'iitkg' },
    globalStyles: { type: mongoose.Schema.Types.Mixed },  
    resumeData: { type: mongoose.Schema.Types.Mixed },
    yjsState: { type: Buffer, default: null },
    createdAt: { type: Date, default: Date.now },
    deployment: {
      githubRepo: {type: String, unique: true},
      vercelUrl : {type: String, unique: true},
    },
  }, { timestamps: true }
);

export default mongoose.model("Resume", resumeSchema);