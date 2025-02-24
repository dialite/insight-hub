import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { pollCommits } from "@/lib/github";
import { indexGithubRepo } from "@/lib/github-loader";

export const projectRouter = createTRPCRouter({
    createProject: protectedProcedure.input(
        z.object({
            name: z.string(),
            githubUrl: z.string(),
            githubToken: z.string().optional()
        })
    ).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.project.create({
            data: {
                githubUrl: input.githubUrl,
                name: input.name,
                userToProjects: {
                    create: {
                        userId: ctx.user.userId!
                    }
                }
            }
        })
        await indexGithubRepo(project.id, input.githubUrl, input.githubToken)
        await pollCommits(project.id)
        return project
    }),
    getProjects: protectedProcedure
  .input(z.object({}).optional())
  .query(async ({ ctx }) => {
    try {
      const projects = await ctx.db.project.findMany({
        where: {
          userToProjects: {
            some: {
              userId: ctx.user.userId!
            }
          },
          deletedAt: null
        }
      });

      // Handle empty project list gracefully
      if (!projects || projects.length === 0) {
        return { projects: [], message: "No projects found." };
      }

      return { projects };
    } catch (error) {
      console.error("Error fetching projects:", error);
      throw new Error("Failed to fetch projects. Please try again later.");
    }
  }),

    getCommits: protectedProcedure.input(z.object({
        projectId: z.string()
    })).query(async ({ctx, input}) => {
        pollCommits(input.projectId).then().catch(console.error)
        return await ctx.db.commit.findMany({where: {projectId: input.projectId}})
    })
})