import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { aiSummarizeCommit } from "./gemini";

export const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const githubUrl = "https://github.com/dialite/Sage";

type Response = {
    commitHash: string;
    commitMessage: string;
    commitAuthorName: string;
    commitDate: string;
    commitAuthorAvatar: string;
};

export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
    if (!githubUrl) {
        throw new Error("GitHub URL is undefined.");
    }

    // console.log("GitHub Url", githubUrl);
    const [owner, repo] = githubUrl.split("/").slice(-2);
    if (!owner || !repo) {
        throw new Error("Invalid github url");
    }

    try {
        const { data } = await octokit.rest.repos.listCommits({
            owner,
            repo
        });

        const sortedCommits = data.sort((a: any, b: any) =>
            new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()) as any[];

        return sortedCommits.slice(0, 10).map((commit: any) => ({
            commitHash: commit.sha as string,
            commitMessage: commit.commit.message ?? "",
            commitAuthorName: commit.commit?.author?.name ?? "",
            commitAuthorAvatar: commit?.author?.avatar_url ?? "",
            commitDate: commit.commit?.author?.date ?? ""
        }));
    } catch (error) {
        console.error("Error fetching commits:", error);
        throw new Error("Failed to fetch commits.");
    }
};

// console.log(await getCommitHashes(githubUrl));

export const pollCommits = async (projectId: string) => {
    const { project, githubUrl } = await fetchProjectGithubUrl(projectId);
    if (!githubUrl) {
        // console.error("No GitHub URL found for the project.");
        return;
    }

    const commitHashes = await getCommitHashes(githubUrl);
    const unprocessedCommits = await filterUnprocessedCommits(projectId, commitHashes);
    const summaryResponses = await Promise.allSettled(unprocessedCommits.map(commit => {
        return summarizeCommit(githubUrl, commit.commitHash);
    }));

    const summaries = summaryResponses.map((responses) => {
        if (responses.status === "fulfilled") {
            return responses.value as string;
        }
        return "";
    });

    const commits = await db.commit.createMany({
        data: summaries.map((summary, index) => {
            console.log(`processing commit ${index}`);
            return {
                projectId: projectId,
                commitHash: unprocessedCommits[index]!.commitHash,
                commitMessage: unprocessedCommits[index]!.commitMessage,
                commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
                commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
                commitDate: unprocessedCommits[index]!.commitDate,
                summary
            };
        })
    });

    return commits;
};

async function summarizeCommit(githubUrl: string, commitHash: string) {
    const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
        headers: {
            Accept: 'application/vnd.github.v3.diff'
        }
    });
    return await aiSummarizeCommit(data) || "";
}

async function fetchProjectGithubUrl(projectId: string) {
    const project = await db.project.findUnique({
        where: { id: projectId },
        select: {
            githubUrl: true
        }
    });
    // console.log("Fetched project:", project);

    if (!project?.githubUrl) {
        // console.error("Project has no github url");
        return { project, githubUrl: "" };
    }
    return { project, githubUrl: project.githubUrl };
}

async function filterUnprocessedCommits(projectId: string, commitHashes: Response[]) {
    const processedCommits = await db.commit.findMany({
        where: { projectId }
    });
    const unprocessedCommits = commitHashes.filter((commit) =>
        !processedCommits.some((processedCommit) => processedCommit.commitHash === commit.commitHash));
    return unprocessedCommits;
}

await pollCommits("d2fa3a76-78e1-469e-a745-6c46d9debd8d").then(console.log);
