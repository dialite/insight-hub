"use client"

import MDEditor from "@uiw/react-md-editor"
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import useProject from '@/hooks/use-project';
import Image from 'next/image';
import React from 'react';
import { askQuestion } from './actions';
import { readStreamableValue } from 'ai/rsc';
import CodeReferences from "./code-references";

const AskQuestionCard = () => {
    const {project} = useProject()
    const [question, setQuestion] = React.useState("")
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [filesReferences, setFilesReferences] = React.useState<{fileName: string; sourceCode: string; summary: string}[]>([])
    const [answer, setAnswer] = React.useState("")

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        setAnswer("")
        setFilesReferences([])
        e.preventDefault()
        if (!project?.id) return
        setLoading(true)

        const {output, filesReferences} = await askQuestion(question, project.id)
        setOpen(true)
        setFilesReferences(filesReferences)

        for await (const delta of readStreamableValue(output)) {
            if (delta) {
                setAnswer(ans => ans + delta)
            }
        }
        setLoading(false)
    }

  return (
    <>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[80vw]">
                <DialogHeader>
                    <DialogTitle>
                        <Image src="/logo.png" alt="insighthub" width={40} height={40}/>
                    </DialogTitle>
                </DialogHeader>

                <MDEditor.Markdown source={answer} className="max-w-[70vw] lh-full max-h-[40vh] overflow-scroll"/>
                <div className="h-4"></div>
                <CodeReferences filesReferences={filesReferences}/>

                <Button type="button" onClick={() => {setOpen(false)}}>
                    Close
                </Button>

            </DialogContent>
        </Dialog>
        <Card className='relative col-span-3'>
            <CardHeader>
                <CardTitle>
                    Ask a question
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit}>
                    <Textarea placeholder='Which file should I edit to change the home page' value={question} onChange={e => setQuestion(e.target.value)}/>
                    <div className='h-4'></div>
                    <Button type='submit' disabled={loading}>
                        Ask InsightHub
                    </Button>
                </form>
            </CardContent>
        </Card>
        </>
    );
}

export default AskQuestionCard;
