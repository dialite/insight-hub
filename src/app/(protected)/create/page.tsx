"use client"

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useRefresh from '@/hooks/use-refresh';
import { api } from '@/trpc/react';
import React from 'react'
import { Form, useForm } from 'react-hook-form';
import { toast } from 'sonner';

type FormInput = {
    repoUrl: string
    projectName: string
    gitHubToken?: string
}

const CreatePage = () => {
    const {register, handleSubmit, reset} = useForm<FormInput>()
    const createProject = api.project.createProject.useMutation()
    const refresh = useRefresh()

    function onSubmit(data: FormInput) {
        createProject.mutate({
            githubUrl: data.repoUrl,
            name: data.projectName,
            githubToken: data.gitHubToken
        }, {
            onSuccess: () => {
                toast.success("Project created successfully")
                refresh()
                reset()
            },
            onError: () => {
                toast.error("Failed to create project")
            }
        })
        return true
    }

  return (
    <div className='flex items-center gap-12 h-full justify-center'>
        <img src='/hero.svg' className='h-56 w-56 rounded-full object-cover'/>
        <div>
            <div>
                <h1 className='font-semibold text-2xl'>
                    Link your GitHub Repository
                </h1>
                <p className='text-sm text-muted-foreground'>
                    Enter the URL of your repository to link it to Insight Hub
                </p>
            </div>
            <div className='h-4'></div>
            <div>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Input
                        {...register("projectName", {required: true})} placeholder='Project Name' required
                    />
                    <div className='h-2'></div>
                    <Input
                        {...register("repoUrl", {required: true})} placeholder='GitHub URL' type='url' required
                    />
                    <div className='h-2'></div>
                    <Input
                        {...register("gitHubToken")} placeholder='GitHub Token (Optional)'
                    />
                    <div className='h-4'></div>
                    <Button type='submit' disabled={createProject.isPending}>
                        Create project
                    </Button>
                </form>
            </div>            
        </div>
    </div>
  )
}

export default CreatePage