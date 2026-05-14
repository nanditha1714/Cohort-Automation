'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { ArrowLeft, RefreshCw, Download, FileText, Sparkles, CheckCircle, XCircle, X, Save, Users, ChevronDown, Calendar, Clock, Gavel, Video, ExternalLink, AlertTriangle, ShieldCheck, Briefcase, Archive, Layout, CheckCircle2, Box, AlertCircle, CreditCard, Upload, Maximize2, Minimize2, Database, Send } from 'lucide-react';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import ReactMarkdown from 'react-markdown';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

import { use } from 'react';
import mammoth from 'mammoth';

const COLORS = ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6'];

const EVALUATION_CRITERIA = [
  { id: 'big_idea', label: 'Big Idea', description: 'What’s the big idea, big vision, or disruption that will be achieved?' },
  { id: 'target_market', label: 'Target Market', description: 'Is the target customer or market clearly defined? Is it a large and growing future market?' },
  { id: 'problem_need', label: 'Problem or Need', description: 'Is the problem or need big and significant? Is the customer painpoint clear and undeniable?' },
  { id: 'solution_10x', label: '10x Solution', description: 'Does the solution provide a true 10x+ step-change (better, faster, cheaper, etc.)?' },
  { id: 'business_model', label: 'Business Model', description: 'Is there a compelling business model that shows how value will be created and driven over time?' },
  { id: 'mvp', label: 'Minimal Viable Product', description: 'Has the MVP tested key assumptions that clearly validate the opportunity?' },
  { id: 'comp_advantage', label: 'Competitive Advantage', description: 'Is the competition understood, and does the value proposition show clear differentiation?' },
  { id: 'gtm_strategy', label: 'Go to Market Strategy', description: 'Is the approach for gaining traction and growing the business strategic yet realistic?' },
  { id: 'financials', label: 'Financials', description: 'Is the financial model clear (costs, required investments, time to breakeven, growth rates, etc.)?' },
  { id: 'strategic_fit', label: 'Strategic Fit', description: 'Does this significantly advance our business strategy?' },
];

const ADDITIONAL_QUESTIONS = [
  { id: 'the_ask', label: 'The Ask', description: 'Does the request make sense?' },
  { id: 'invest_in_self', label: 'Invest in Self', description: 'Are you ready to invest in yourself to acquire better technical skills and get access to marketing support and a mentor network?' },
  { id: 'mentoring_commitment', label: 'Mentoring Commitment', description: 'Will you be able to spend approximately 5 hours in a week on various mentoring sessions?' },
  { id: 'investment_type', label: 'Investment Type & Timeline', description: 'Could you specify the type of investment you are seeking and the timeline within which you hope to secure it?' },
  { id: 'market_access', label: 'Market Access', description: 'What kind of market access you are looking at?' },
];

export default function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isInternalReviewPage = searchParams.get('from') === 'internal_review';
    const isAIAnalysisPage = searchParams.get('from') === 'ai_analysis';
    const isJuryReviewPage = searchParams.get('from') === 'jury_review';
    const isPaymentContext = searchParams.get('from') === 'payments';

    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'custom' | 'readiness' | 'onepager' | 'raw' | 'jury_eval' | 'financials'>(
        (searchParams.get('from') === 'financial_verification' || searchParams.get('from') === 'payments') ? 'financials' : 
        (searchParams.get('from') === 'jury_review') ? 'onepager' : 'custom'
    );
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [financialDocs, setFinancialDocs] = useState<any[]>([]);
    const [loadingFinancials, setLoadingFinancials] = useState(false);

    // Internal Review State
    const [reviews, setReviews] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [evaluation, setEvaluation] = useState('');
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [isRefetchingReviews, setIsRefetchingReviews] = useState(false);
    const [activeDeptTab, setActiveDeptTab] = useState<string>('iPreneur');
    
    // Admin Override State
    const [adminEvaluation, setAdminEvaluation] = useState('');
    const [adminReason, setAdminReason] = useState('');

    // Jury Assignment State
    const [juryMembers, setJuryMembers] = useState<any[]>([]);
    const [assignedJuryIds, setAssignedJuryIds] = useState<string[]>([]);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);
    const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
    const [isSavingAssignments, setIsSavingAssignments] = useState(false);
    const [isJuryAssigned, setIsJuryAssigned] = useState<boolean | null>(null);
    const [isJuryDropdownOpen, setIsJuryDropdownOpen] = useState(false);
    const [isJuryModalOpen, setIsJuryModalOpen] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [scheduledZoomLink, setScheduledZoomLink] = useState('');
    const [isEvalFormOpen, setIsEvalFormOpen] = useState(false);
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [zakToken, setZakToken] = useState<string | null>(null);
    const [hostKey, setHostKey] = useState<string | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [activeJuryId, setActiveJuryId] = useState<string | null>(null);
    
    // MOU Review State
    const [mouDraft, setMouDraft] = useState<any>(null);
    const [isSendingMOU, setIsSendingMOU] = useState(false);
    const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
    const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
    const [customMOU, setCustomMOU] = useState<{ name: string; base64: string } | null>(null);
    const [mouMode, setMouMode] = useState<'FIELDS' | 'EDITOR'>('EDITOR');
    const [editorContent, setEditorContent] = useState('');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isSyncingTemplate, setIsSyncingTemplate] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [showPitchDeck, setShowPitchDeck] = useState(false);
    const [jurySearchQuery, setJurySearchQuery] = useState('');



    useEffect(() => {
        if (userProfile?.role?.toUpperCase() === 'JURY' && activeTab !== 'onepager') {
            setActiveTab('onepager');
        }
    }, [userProfile]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [editorContent, isMaximized]);

    useEffect(() => {
        if (mouMode === 'EDITOR' && !editorContent && submission) {
            fetchTemplateText();
        }
    }, [mouMode, submission]);

    const fetchTemplateText = async () => {
        try {
            // Priority 1: Check if this startup already has a saved custom draft
            if (submission?.form_data?.__mou_draft_content) {
                setEditorContent(submission.form_data.__mou_draft_content);
                return;
            }
            const res = await fetch('/api/admin/mou-template-text');
            const data = await res.json();
            if (data.content) {
                const formKeys = Object.keys(submission?.form_data || {});

                const findField = (keywords: string[]): string => {
                    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const key = formKeys.find(k => {
                        const normalizedK = normalize(k);
                        return keywords.some(kw => normalizedK.includes(normalize(kw)));
                    });
                    return key ? String(submission.form_data[key]) : '';
                };

                let content = data.content as string;

                // Perform substitutions

                const substitutions: Record<string, string> = {
                    company_name:
                        submission?.company_name ||
                        findField(['start name', 'startup name', 'company name', 'start up name', 'venture name', 'name of venture', 'name of the startup']) ||
                        '[Company Name]',
                    Startup:
                        submission?.company_name ||
                        findField(['start name', 'startup name', 'company name', 'start up name', 'venture name', 'name of venture', 'name of the startup']) ||
                        '[Startup Name]',
                    Address:
                        submission?.form_data?.__mou_draft?.address ||
                        mouDraft?.address ||
                        findField(['registered office address', 'corporate address', 'startup address', 'office address', 'registered address', 'location', 'permanent address', 'address for communication', 'headquarters', 'full address', 'address']) ||
                        '[Address]',
                    Founder:
                        submission?.form_data?.__mou_draft?.founder ||
                        mouDraft?.founder ||
                        findField(['founder name', 'founder', 'your name', 'applicant name', 'name of founder', 'full name', 'founder details']) ||
                        findField(['name']) ||
                        '[Founder Name]',
                    founder:
                        submission?.form_data?.__mou_draft?.founder ||
                        mouDraft?.founder ||
                        findField(['founder name', 'founder', 'your name', 'applicant name', 'name of founder', 'full name', 'founder details']) ||
                        findField(['name']) ||
                        '[Founder Name]',
                    address:
                        submission?.form_data?.__mou_draft?.address ||
                        mouDraft?.address ||
                        findField(['registered office address', 'corporate address', 'startup address', 'office address', 'registered address', 'location', 'permanent address', 'address for communication', 'headquarters', 'full address', 'address']) ||
                        '[Address]',
                    date: new Date().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                    })
                };

                // Replace both {{variable}} (double-brace) and {variable} (single-brace) formats
                Object.entries(substitutions).forEach(([key, val]) => {
                    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val); // {{date}}
                    content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), val);       // {date}
                });
                setEditorContent(content);
            }
        } catch (err) { console.error('Error fetching template text:', err); }
    };

    const handleSyncTemplate = async () => {
        if (!confirm('This will replace the current editor content with the text from your uploaded Master Word file. Continue?')) return;
        setIsSyncingTemplate(true);
        try {
            const res = await fetch('/api/admin/mou-template/sync', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setEditorContent(data.content);
                alert('Synchronized from Master Word successfully!');
            } else {
                alert(data.error || 'Failed to sync');
            }
        } catch (err) { alert('Error syncing from Master Word'); }
        finally { setIsSyncingTemplate(false); }
    };

    const handleSaveTemplateText = async () => {
        setIsSavingTemplate(true);
        try {
            const res = await fetch('/api/admin/mou-template-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editorContent })
            });
            if (res.ok) alert('Master Template updated!');
        } catch (err) { alert('Error saving template.'); }
        finally { setIsSavingTemplate(false); }
    };

    const handleSaveMOUDraft = async () => {
        if (!submission) return;
        setIsSavingTemplate(true);
        try {
            const res = await fetch(`/api/admin/submissions/${submission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_data: {
                        __mou_draft_content: editorContent
                    }
                })
            });
            if (res.ok) {
                alert('MOU Draft saved for this startup!');
            } else { alert('Failed to save draft.'); }
        } catch (err) { alert('Error saving draft.'); }
        finally { setIsSavingTemplate(false); }
    };

    const insertVariable = (variable: string) => {
        setEditorContent(prev => prev + ` {${variable}}`);
    };

    const getProcessedContent = () => {
        let content = editorContent;
        const findField = (keywords: string[]): string => {
            const formData = submission?.form_data || {};
            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const key = Object.keys(formData).find(k => {
                const normalizedK = normalize(k);
                return keywords.some(kw => normalizedK.includes(normalize(kw)));
            });
            return key ? String(formData[key]) : '';
        };


        const data: Record<string, string> = {
            company_name: mouDraft?.company_name || submission?.company_name || findField(['start name', 'startup name', 'company name', 'venture name', 'name of the startup']) || 'Startup Name',
            startup_name: mouDraft?.company_name || submission?.company_name || findField(['start name', 'startup name', 'company name', 'venture name', 'name of the startup']) || 'Startup Name',
            Startup: mouDraft?.company_name || submission?.company_name || findField(['start name', 'startup name', 'company name', 'venture name', 'name of the startup']) || 'Startup Name',
            founder: mouDraft?.founder || submission?.form_data?.__mou_draft?.founder || findField(['founder name', 'founder', 'your name', 'applicant name', 'full name']) || 'Founder Name',
            Founder: mouDraft?.founder || submission?.form_data?.__mou_draft?.founder || findField(['founder name', 'founder', 'your name', 'applicant name', 'full name']) || 'Founder Name',
            address: mouDraft?.address || submission?.form_data?.__mou_draft?.address || findField(['registered office address', 'corporate address', 'startup address', 'office address', 'registered address', 'location', 'permanent address', 'headquarters']) || 'Company Address',
            Address: mouDraft?.address || submission?.form_data?.__mou_draft?.address || findField(['registered office address', 'corporate address', 'startup address', 'office address', 'registered address', 'location', 'permanent address', 'headquarters']) || 'Company Address',
            date: mouDraft?.date || new Date().toLocaleDateString('en-GB')
        };

        Object.entries(data).forEach(([key, val]) => {
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val as string);
            content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), val as string);
        });

        return content;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomMOU({
                    name: file.name,
                    base64: (reader.result as string).split(',')[1]
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateMasterTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm('Are you sure you want to replace the GLOBAL MOU template? This will affect all future MOUs.')) return;
        setIsUpdatingTemplate(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const res = await fetch('/api/admin/mou-template', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileBase64: base64 })
                });
                if (res.ok) alert('Master Template updated successfully!');
                else alert('Failed to update template.');
            };
            reader.readAsDataURL(file);
        } catch (err) {
            alert('Error updating template.');
        } finally {
            setIsUpdatingTemplate(false);
        }
    };

    const handleDownloadMasterTemplate = async () => {
        try {
            const res = await fetch('/api/admin/mou-template');
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'master_mou_template.docx';
                document.body.appendChild(a); a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (err) { alert('Error downloading template.'); }
    };

    const handleDownloadDraft = async () => {
        setIsGeneratingDraft(true);
        try {
            const formKeys = Object.keys(submission?.form_data || {});
            const findField = (keywords: string[]): string => {
                const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                const key = formKeys.find(k => {
                    const normalizedK = normalize(k);
                    return keywords.some(kw => normalizedK.includes(normalize(kw)));
                });
                return key ? String(submission.form_data[key]) : '';
            };

            const draftData = {
                company_name: mouDraft?.company_name || submission.form_data?.__mou_draft?.company_name || submission.company_name || findField(['start name', 'startup name', 'company name', 'venture name']) || 'Startup',
                founder: mouDraft?.founder || submission.form_data?.__mou_draft?.founder || findField(['founder name', 'founder', 'applicant name', 'full name']) || 'Founder',
                address: mouDraft?.address || submission.form_data?.__mou_draft?.address || findField(['registered office address', 'corporate address', 'startup address', 'office address', 'registered address', 'location', 'permanent address', 'address']) || 'Address',
                date: mouDraft?.date || submission.form_data?.__mou_draft?.date || new Date().toLocaleDateString('en-GB')
            };
            const res = await fetch(`/api/admin/submissions/${submission.id}/generate-mou-draft`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draftData)
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `MOU_Draft_${draftData.company_name}.docx`;
                document.body.appendChild(a); a.click();
                window.URL.revokeObjectURL(url);
            } else { alert('Failed to generate draft.'); }
        } catch (err) { alert('Error generating draft.'); }
        finally { setIsGeneratingDraft(false); }
    };

    const handleSendMOU = async () => {
        setIsSendingMOU(true);
        try {
            let pdfBase64 = '';
            let docxBase64 = '';
            const companyName = mouDraft?.company_name || submission?.company_name || 'Startup';
            const startupEmail = submission?.form_data?.email || Object.values(submission?.form_data || {}).find(v => String(v).includes('@'));

            // 1. Identify source file (Uploaded Custom Word or Auto-Generated Draft)
            let fileToConvert = customMOU?.base64;
            let fileName = customMOU?.name || 'MOU.docx';

            if (!fileToConvert) {
                // Generate draft if no custom file
                const formKeys = Object.keys(submission?.form_data || {});
                const findField = (keywords: string[]): string => {
                    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const key = formKeys.find(k => {
                        const normalizedK = normalize(k);
                        return keywords.some(kw => normalizedK.includes(normalize(kw)));
                    });
                    return key ? String(submission.form_data[key]) : '';
                };

                const draftData = {
                    company_name: mouDraft?.company_name || submission.form_data?.__mou_draft?.company_name || submission.company_name || findField(['start name', 'startup name', 'company name', 'venture name']) || 'Startup',
                    founder: mouDraft?.founder || submission.form_data?.__mou_draft?.founder || findField(['founder name', 'founder', 'applicant name', 'full name']) || 'Founder',
                    address: mouDraft?.address || submission.form_data?.__mou_draft?.address || findField(['registered office address', 'corporate address', 'startup address', 'office address', 'registered address', 'location', 'permanent address', 'address']) || 'Address',
                    date: mouDraft?.date || submission.form_data?.__mou_draft?.date || new Date().toLocaleDateString('en-GB')
                };

                const draftRes = await fetch(`/api/admin/submissions/${submission.id}/generate-mou-draft`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(draftData)
                });
                
                if (draftRes.ok) {
                    const blob = await draftRes.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    fileToConvert = window.btoa(
                        new Uint8Array(arrayBuffer)
                            .reduce((data, byte) => data + String.fromCharCode(byte), '')
                    );
                }
            }

            if (fileToConvert) {
                const isAlreadyPDF = fileName.toLowerCase().endsWith('.pdf');
                if (isAlreadyPDF) {
                    pdfBase64 = fileToConvert;
                } else {
                    docxBase64 = fileToConvert;
                }
            }

            if (!pdfBase64 && !docxBase64) throw new Error("Could not prepare MOU file");

            // Send via Email API - Backend now handles LibreOffice conversion if docxBase64 is sent
            const res = await fetch(`/api/admin/submissions/${submission.id}/send-mou-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    pdfBase64,
                    docxBase64,
                    company_name: companyName,
                    startupEmail: startupEmail
                }),
            });
            
            const data = await res.json();
            if (data.success) {
                alert('MOU sent successfully as a PDF!');
                fetchData(submission.id);
            } else { alert('Failed to send: ' + data.error); }
        } catch (err) { 
            console.error(err);
            alert('An error occurred during MOU preparation.'); 
        } finally { setIsSendingMOU(false); }
    };

    const generatePDFFromText = async () => {
        const printContainer = document.createElement('div');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.width = '210mm';
        printContainer.style.padding = '25mm';
        printContainer.style.background = 'white';
        printContainer.style.fontFamily = "'Times New Roman', Times, serif";
        printContainer.style.fontSize = '12pt';
        printContainer.style.lineHeight = '1.6';
        
        const content = getProcessedContent();
        printContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #4f46e5; padding-bottom: 20px;">
                <img src="/ipreneur_logo.png" style="height: 60px; margin-bottom: 10px;" />
                <div style="font-size: 10pt; color: #4f46e5; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Memorandum of Understanding</div>
            </div>
            <div style="text-align: justify; white-space: pre-wrap;">${content}</div>
        `;
        
        document.body.appendChild(printContainer);
        
        // Wait for logo
        const logoImg = printContainer.querySelector('img');
        if (logoImg) {
            await new Promise((resolve) => {
                if (logoImg.complete) resolve(true);
                else logoImg.onload = () => resolve(true);
            });
        }

        const canvas = await html2canvas(printContainer, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height / 2) * (pageWidth / (canvas.width / 2));
        
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const result = pdf.output('datauristring');
        document.body.removeChild(printContainer);
        return result;
    };

    const handleSendMOUText = async () => {
        setIsSendingMOU(true);
        try {
            const pdfBase64Data = await generatePDFFromText();
            const pdfBase64 = pdfBase64Data.split(',')[1];
            const companyName = mouDraft?.company_name || submission?.company_name || 'Startup';
            
            const res = await fetch(`/api/admin/submissions/${submission.id}/send-mou-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    pdfBase64,
                    company_name: companyName,
                    startupEmail: submission?.form_data?.email || Object.values(submission?.form_data || {}).find(v => String(v).includes('@'))
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert('MOU PDF sent successfully!');
                checkSessionAndFetch(submission.id);
            } else { alert('Failed: ' + data.error); }
        } catch (err) { 
            console.error(err);
            alert('Error generating or sending PDF.'); 
        }
        finally { setIsSendingMOU(false); }
    };

    // --- Onboarding Flow: Redirect to Onboarding tab if onboarded ---
    useEffect(() => {
        if (submission?.is_onboarded && activeTab !== 'financials' && !isAIAnalysisPage && !isInternalReviewPage && !isJuryReviewPage) {
            setActiveTab('financials');
        }
    }, [submission?.is_onboarded]);

    const handleWithdraw = async () => {
        if (!confirm("Are you sure you want to withdraw this application from the cohort? This will move it back to internal review.")) return;
        
        setIsWithdrawing(true);
        try {
            const res = await fetch(`/api/admin/submissions/${submission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    is_onboarded: false,
                    is_rejected: false,
                    is_withdrawn: true,
                    internal_review_notes: `Withdrawn from cohort on ${new Date().toLocaleDateString()}`
                })
            });

            if (!res.ok) throw new Error("Failed to withdraw via API");
            
            alert("Startup withdrawn from cohort successfully.");
            router.push('/dashboard?tab=onboarding');
        } catch (err: any) {
            console.error("Withdrawal error:", err);
            alert("Failed to withdraw: " + (err.message || "Unknown error"));
        } finally {
            setIsWithdrawing(false);
        }
    };

    const resolvedParams = use(params);
    const id = resolvedParams.id;

    useEffect(() => {
        if (id) {
            checkSessionAndFetch(id);
            fetchReviews(id);
            fetchJuryMembers();
        }
    }, [id]);

    useEffect(() => {
        const from = searchParams.get('from');
        if (from === 'payments' || from === 'financial_verification') {
            setActiveTab('financials');
        }
    }, [searchParams]);

    const OnePagerPremiumTemplate = ({ data }: { data: any }) => {
        if (!data) return null;

        return (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-sm overflow-hidden font-sans text-gray-900 dark:text-gray-100 max-w-5xl mx-auto shadow-xl">
                {/* HERO HEADER */}
                <div className="bg-[#5d45f9] p-12 text-center text-white">
                    <h1 className="text-4xl font-black mb-2 uppercase tracking-tight">{submission?.company_name}</h1>
                    <a href={data.website_url} target="_blank" rel="noreferrer" className="text-white/80 text-sm underline hover:text-white transition-colors block mb-6">{data.website_url}</a>
                    <p className="text-sm max-w-3xl mx-auto leading-relaxed opacity-90">
                        {data.company_description}
                    </p>
                </div>

                <div className="p-10 space-y-12">
                    {/* USP */}
                    <section className="space-y-4">
                        <div className="bg-[#ff9d00] text-white px-4 py-2 font-black text-xs tracking-widest uppercase inline-block">
                            ---{'>'} USP (UNIQUE SELLING PROPOSITION)
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-sm">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{data.usp}</p>
                        </div>
                    </section>

                    {/* POTENTIAL INDEX */}
                    <section className="space-y-6">
                        <div className="bg-[#a800ff] text-white px-4 py-2 font-black text-xs tracking-widest uppercase block">
                            ---{'>'} STARTUP POTENTIAL INDEX
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-2xl border border-gray-100 dark:border-white/5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">THEORETICAL ANALYSIS</h3>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {data.startup_potential?.theoretical}
                                    </p>
                                </div>
                                <div className="h-[300px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.startup_potential?.graphical_data}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                                            <Radar
                                                name="Potential"
                                                dataKey="score"
                                                stroke="#5d45f9"
                                                strokeWidth={2}
                                                fill="#5d45f9"
                                                fillOpacity={0.3}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                                {data.startup_potential?.graphical_data?.slice(0, 2).map((item: any, idx: number) => (
                                    <div key={idx} className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/5 text-center shadow-sm">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.subject}</p>
                                        <p className="text-2xl font-black text-[#5d45f9]">{item.score}%</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* OUR OFFERING */}
                    <section className="space-y-6">
                        <div className="bg-[#c08cfc] text-white px-4 py-2 font-black text-xs tracking-widest uppercase block">
                            ---{'>'} OUR OFFERING
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {data.our_offering?.map((offering: any, idx: number) => (
                                <div key={idx} className="space-y-3">
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{offering.title}:</h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{offering.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* HIGHLIGHTS & FEATURES */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <section className="space-y-6">
                            <div className="bg-[#c08cfc] text-white px-4 py-2 font-black text-xs tracking-widest uppercase block">
                                ---{'>'} HIGHLIGHTS
                            </div>
                            <div className="space-y-8">
                                {data.highlights?.map((highlight: any, idx: number) => (
                                    <div key={idx} className="space-y-2">
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase">{highlight.title}</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{highlight.description}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="bg-[#c08cfc] text-white px-4 py-2 font-black text-xs tracking-widest uppercase block">
                                ---{'>'} PRODUCT FEATURES
                            </div>
                            <div className="grid grid-cols-1 gap-8">
                                {data.product_features?.map((feature: any, idx: number) => (
                                    <div key={idx} className="space-y-2">
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase">{feature.title}</h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{feature.description}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* FOUNDERS SECTION */}
                    <section className="pt-12 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3 mb-8">
                            <Users className="w-5 h-5 text-[#5d45f9]" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">MANAGEMENT TEAM</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                            {data.founders?.map((founder: any, idx: number) => (
                                <div key={idx} className="space-y-1">
                                    <h3 className="text-sm font-black text-[#5d45f9]">{founder.name}</h3>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{founder.role}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* REVENUE METRICS */}
                    {/* REVENUE & FORECAST */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <section className="space-y-4">
                            <div className="bg-[#c08cfc] text-white px-4 py-1 font-bold text-[10px] tracking-widest uppercase flex justify-between items-center">
                                <span>---{'>'} REVENUE PROJECTIONS</span>
                                <span className="opacity-70">(in {data.revenue_projections_scale || 'Crores'})</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-sm min-h-[250px]">
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={data.revenue_projections}>
                                        <XAxis dataKey="year" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ fill: 'rgba(93, 69, 249, 0.05)' }}
                                        />
                                        <Bar dataKey="value" fill="#805ad5" radius={[4, 4, 0, 0]} barSize={60} />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="grid grid-cols-2 gap-4 mt-4 border-t border-gray-100 dark:border-white/5 pt-4">
                                    {data.revenue_projections?.map((item: any, idx: number) => (
                                        <div key={idx} className="text-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{item.year}</p>
                                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{item.value} {data.revenue_projections_scale || 'Crores'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="bg-[#c08cfc] text-white px-4 py-1 font-bold text-[10px] tracking-widest uppercase block">
                                ---{'>'} FORECAST
                            </div>
                            <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-sm min-h-[250px]">
                                <div className="grid grid-cols-2 gap-8 items-start h-full">
                                    <div className="space-y-2 text-center">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">TOTAL TURNOVER</p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white">
                                            {typeof data.forecast?.total_turnover === 'string' 
                                                ? data.forecast?.total_turnover.split('(')[0].trim() 
                                                : data.forecast?.total_turnover}
                                        </p>
                                        <p className="text-[8px] font-bold text-gray-500 leading-tight">
                                            {typeof data.forecast?.total_turnover === 'string' && data.forecast?.total_turnover.includes('(') 
                                                ? `(${data.forecast.total_turnover.split('(')[1]}` 
                                                : ''}
                                        </p>
                                    </div>
                                    <div className="space-y-2 text-center">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">TOTAL REVENUE</p>
                                        <p className="text-sm font-black text-gray-900 dark:text-white">
                                            {typeof data.forecast?.total_revenue === 'string' 
                                                ? data.forecast?.total_revenue.split('(')[0].trim() 
                                                : data.forecast?.total_revenue}
                                        </p>
                                        <p className="text-[8px] font-bold text-gray-500 leading-tight">
                                            {typeof data.forecast?.total_revenue === 'string' && data.forecast?.total_revenue.includes('(') 
                                                ? `(${data.forecast.total_revenue.split('(')[1]}` 
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-auto pt-10 text-center">
                                    <p className="text-[10px] text-gray-400 italic">Breakdown unavailable</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* CURRENT TRACTION FOOTER */}
                    <section className="space-y-2 pt-4">
                        <div className="bg-[#b91c1c] text-white px-4 py-2 font-black text-xs tracking-widest uppercase block">
                            ---{'>'} CURRENT TRACTION
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6 p-4">
                            {data.current_traction?.map((item: any, idx: number) => (
                                <div key={idx} className="space-y-0.5">
                                    <p className="text-xl font-black text-gray-900 dark:text-white leading-none">{item.value}</p>
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest opacity-80">{item.description}</p>
                                    <p className="text-[9px] font-bold text-gray-400 leading-tight truncate">{item.title}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        );
    };

    useEffect(() => {
        if (resolvedParams.id) {
            checkSessionAndFetch(resolvedParams.id);
        }
    }, [resolvedParams.id]);

    useEffect(() => {
        const from = searchParams.get('from');
        if (from === 'financial_verification' || from === 'payments') {
            setActiveTab('financials');
        } else if (from === 'jury_review') {
            setActiveTab('jury_eval');
        } else if (userProfile && (userProfile.role === 'ADMIN' || userProfile.role === 'INTERNAL_TEAM') && !from && activeTab === 'custom' && !isAIAnalysisPage && !isInternalReviewPage && !isJuryReviewPage) {
            setActiveTab('financials');
        } else if (submission?.is_jury_accepted && !submission?.is_onboarded && activeTab !== 'financials' && activeTab === 'custom' && !isAIAnalysisPage && !isInternalReviewPage && !isJuryReviewPage) {
            setActiveTab('financials');
        }
    }, [submission, searchParams, userProfile, activeTab]);

    const checkSessionAndFetch = async (id: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        // Initial permission check
        if (!profile || profile.status === 'INACTIVE') {
            router.push('/dashboard');
            return;
        }

        // If Jury, check assignments before proceeding
        if (profile.role === 'JURY') {
            const { data: assignment, error: assignError } = await supabase
                .from('jury_assignments')
                .select('*')
                .eq('submission_id', id)
                .eq('jury_id', session.user.id)
                .single();

            if (assignError || !assignment) {
                alert("You are not assigned to this startup.");
                router.push('/dashboard');
                return;
            }
            setIsJuryAssigned(true);
        }

        setUserProfile(profile);
        if (profile?.role === 'ADMIN') {
            setActiveDeptTab('Admin');
        } else if (profile?.department) {
            setActiveDeptTab(profile.department);
        }

        // Normalized Tab Logic
        const tabParam = searchParams.get('tab') || searchParams.get('from');
        
        if (tabParam === 'financial_verification' || tabParam === 'financials' || tabParam === 'payments') {
            setActiveTab('financials');
        } else if (tabParam === 'jury_review') {
            setActiveTab('onepager');
        } else if (profile?.role === 'JURY') {
            setActiveTab('onepager');
        } else if (profile?.role === 'ADMIN' || profile?.role === 'INTERNAL_TEAM') {
            setActiveTab('custom'); // Analysis (Default)
        } else {
            setActiveTab('custom');
        }

        fetchData(id, profile);
    };

    const fetchReviews = async (id: string) => {
        setIsRefetchingReviews(true);
        try {
            const res = await fetch(`/api/admin/submissions/${id}/reviews`, { cache: 'no-store' });
            const data = await res.json();
            if (data.reviews) {
                setReviews(data.reviews);

                // If the user has already left a review, pre-fill their form
                if (userProfile?.department) {
                    const myReview = data.reviews.find((r: any) => r.department?.toLowerCase() === userProfile.department?.toLowerCase());
                    if (myReview) {
                        setEvaluation(myReview.evaluation || '');
                        setReason(myReview.reason || '');
                    }
                }
                
                // If user is Admin, pre-fill admin overrides if they exist
                if (userProfile?.role === 'ADMIN') {
                    const adminReview = data.reviews.find((r: any) => r.department === 'Admin');
                    if (adminReview) {
                        setAdminEvaluation(adminReview.evaluation || '');
                        setAdminReason(adminReview.reason || '');
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch reviews");
        } finally {
            setIsRefetchingReviews(false);
        }
    };

    const fetchAssignments = async (id: string) => {
        try {
            // Get session for auth
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`/api/admin/submissions/${id}/assignments`, { 
                cache: 'no-store',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                }
            });
            const data = await res.json();
            if (data.assignments) {
                setAssignedJuryIds(data.assignments.map((a: any) => a.jury_id));
                if (data.assignments.length > 0) {
                    setScheduledDate(data.assignments[0].scheduled_date || '');
                    setScheduledTime(data.assignments[0].scheduled_time || '');
                    setScheduledZoomLink(data.assignments[0].zoom_link || '');
                }
                if (data.zakToken) {
                    setZakToken(data.zakToken);
                }
                if (data.hostKey) {
                    setHostKey(data.hostKey);
                }
                if (data.userEmail) {
                    setCurrentUserEmail(data.userEmail);
                }
            }
        } catch (e) {
            console.error("Failed to fetch assignments");
        }
    };

    const handleRegenerateMeeting = async () => {
        if (!submission?.id) return;
        
        setIsRefetchingReviews(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`/api/admin/submissions/${submission.id}/assignments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    juryIds: assignedJuryIds,
                    scheduledDate,
                    scheduledTime
                })
            });

            if (res.ok) {
                await fetchAssignments(submission.id);
                alert('Meeting successfully regenerated with a fresh ID!');
            } else {
                throw new Error('Failed to regenerate');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to regenerate meeting. Please try manually re-assigning.');
        } finally {
            setIsRefetchingReviews(false);
        }
    };
    
    const fetchJuryMembers = async () => {
        try {
            const res = await fetch('/api/admin/users?role=JURY', { cache: 'no-store' });
            const data = await res.json();
            if (data.users) {
                setJuryMembers(data.users);
            }
        } catch (e) {
            console.error("Failed to fetch jury members");
        }
    };

    const fetchFinancialDocs = async (id: string) => {
        setLoadingFinancials(true);
        try {
            const res = await fetch(`/api/admin/financial-documents?id=${id}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.documents) {
                setFinancialDocs(data.documents);
            }
        } catch (e) {
            console.error("Failed to fetch financial documents");
        } finally {
            setLoadingFinancials(false);
        }
    };

    const getSignedUrl = async (path: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('financial-documents')
                .createSignedUrl(path, 3600); // 1 hour link

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error) {
            console.error('Error generating signed URL:', error);
            alert('Failed to generate preview link. Please ensure permissions are set.');
        }
    };

    const fetchEvaluations = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/submissions/${id}/evaluations`, { cache: 'no-store' });
            const data = await res.json();
            console.log('Fetched Evaluations for', id, ':', data.evaluations);
            if (data.evaluations) {
                setEvaluations(data.evaluations);
                if (data.evaluations.length > 0 && !activeJuryId) {
                    setActiveJuryId(data.evaluations[0].jury_id);
                }
            }
        } catch (e) {
            console.error("Failed to fetch evaluations:", e);
        }
    };

    const calculateTotalScore = (scores: any) => {
        const scoredAdditionalIds = ADDITIONAL_QUESTIONS
            .filter(q => !['investment_type', 'market_access'].includes(q.id))
            .map(q => q.id);
            
        return Object.entries(scores || {})
            .filter(([key]) => EVALUATION_CRITERIA.some(c => c.id === key) || scoredAdditionalIds.includes(key))
            .reduce((sum, [_, s]) => sum + (Number(s) || 0), 0);
    };

    const handleSaveEvaluation = async (scores: any, notes: any, totalScore: number) => {
        if (!userProfile?.id) return;
        
        // Optimistic update for instant visual feedback
        setEvaluations(prev => {
            const exists = prev.find(e => e.jury_id === userProfile.id);
            if (exists) {
                return prev.map(e => e.jury_id === userProfile.id 
                    ? { ...e, scores, notes, total_score: totalScore } 
                    : e
                );
            } else {
                return [...prev, { 
                    jury_id: userProfile.id, 
                    scores, 
                    notes, 
                    total_score: totalScore,
                    user_profiles: { name: userProfile.name } 
                }];
            }
        });

        setIsSavingEvaluation(true);
        try {
            const res = await fetch(`/api/admin/submissions/${submission.id}/evaluations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    juryId: userProfile.id,
                    scores,
                    notes,
                    totalScore
                })
            });
            if (res.ok) {
                fetchEvaluations(submission.id);
            }
        } catch (err) {
            console.error('Failed to save evaluation:', err);
        } finally {
            setIsSavingEvaluation(false);
        }
    };

    const parseZoomUrl = (url: string) => {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const meetingId = pathParts[pathParts.length - 1]; // e.g. /j/123456789
            const password = urlObj.searchParams.get('pwd');
            
            // Convert to Web Client URL
            // Pattern: https://zoom.us/wc/join/{meetingId}?pwd={password}
            return `https://zoom.us/wc/join/${meetingId}${password ? `?pwd=${password}` : ''}`;
        } catch (e) {
            return url; // Fallback to original
        }
    };

    const handleFinalEvaluationSubmit = async () => {
        if (!userProfile?.id) return;
        
        const confirmSubmit = confirm('Are you sure you want to submit your final evaluation? This will move the startup to the next stage.');
        if (!confirmSubmit) return;

        setIsSubmittingEvaluation(true);
        try {
            // Check if this is the last jury member to submit
            const totalAssigned = assignedJuryIds.length;
            const currentEvaluationsCount = evaluations.length;
            const hasMyEval = evaluations.some(e => e.jury_id === userProfile.id);
            
            // If I'm submitting and I'm the last one (or already all are there)
            const isLastOne = (currentEvaluationsCount >= totalAssigned) || (!hasMyEval && currentEvaluationsCount + 1 >= totalAssigned);

            const payload: any = {};
            if (isLastOne) {
                payload.is_jury_reviewed = true;
            }

            const res = await fetch(`/api/admin/submissions/${submission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Success! Close drawer and refresh
                setIsEvalFormOpen(false);
                alert('Your evaluation has been successfully submitted.');
                fetchData(submission.id);
            } else {
                alert('Failed to update evaluation status.');
            }
        } catch (err) {
            console.error('Error submitting evaluation:', err);
        } finally {
            setIsSubmittingEvaluation(false);
        }
    };

    const fetchData = async (id: string, profileToUse?: any) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/submissions/${id}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.submission) {
                // Normalize status fields from form_data for easy access
                const sub = data.submission;
                
                if (!sub.financial_status && sub.form_data?.__financial_status) {
                    sub.financial_status = sub.form_data.__financial_status;
                }
                
                if (sub.form_data?.__payment_status) {
                    sub.payment_status = sub.form_data.__payment_status;
                } else if (!sub.payment_status && sub.is_payment_completed) {
                    sub.payment_status = 'PAID';
                }

                if (sub.form_data?.__razorpay_order_id) {
                    sub.razorpay_order_id = sub.form_data.__razorpay_order_id;
                }

                if (sub.form_data?.__razorpay_payment_id) {
                    sub.razorpay_payment_id = sub.form_data.__razorpay_payment_id;
                }

                setSubmission(sub);
                if (sub.form_data?.__mou_draft) {
                    setMouDraft(sub.form_data.__mou_draft);
                }
                fetchReviews(id);
                fetchAssignments(id);
                fetchEvaluations(id);
                fetchFinancialDocs(id);
                
                // Use profileToUse if provided, otherwise fallback to the current state
                const currentProfile = profileToUse || userProfile;
                
                // Only iPreneur and Admin need to see all Jury members for assignment
                if (currentProfile?.role === 'ADMIN' || currentProfile?.role === 'INTERNAL_TEAM') {
                    fetchJuryMembers();
                }
            }
        } catch (error) {
            console.error('Error fetching submission:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!submission) {
        return <div className="text-center p-12 text-black dark:text-white">Submission not found.</div>;
    }

    // Convert form JSON object into an array and sort it by the number prefix in the question string
    const formFields = Object.entries(submission.form_data || {}).sort((a: any, b: any) => {
        // Extract the leading number from strings like "1. WHAT'S YOUR COMPANY NAME" or "10: What is your MRR?"
        const getNum = (str: string) => {
            const match = str.match(/^(\d+)/);
            return match ? parseInt(match[1], 10) : 999; // Default to 999 to push non-numbered items to the bottom
        };
        return getNum(a[0]) - getNum(b[0]);
    });

    const renderAnalysisContent = (content: any, fallback: string) => {
        if (!content) return <p className="italic text-gray-500">{fallback}</p>;

        let parsed: any = null;
        try {
            if (typeof content === 'object') {
                parsed = content;
            } else {
                // Attempt to strip potential markdown code block wrappers
                const cleanedContent = content.trim().replace(/^```json\s*/, '').replace(/```$/, '').trim();
                parsed = JSON.parse(cleanedContent);
            }

            // SPECIAL CASE: ONE PAGER PREMIUM TEMPLATE
            if (parsed && (parsed.usp || parsed.our_offering || parsed.product_features)) {
                return <OnePagerPremiumTemplate data={parsed} />;
            }

            // Support both the old array format and the new { items, conclusion } format
            const hasItemsArray = parsed.items && Array.isArray(parsed.items);
            const dataToRender = hasItemsArray ? parsed.items : (Array.isArray(parsed) ? parsed : null);

            if (dataToRender && dataToRender.length > 0 && ('criteria' in dataToRender[0] || 'status' in dataToRender[0])) {
                return (
                    <div className="flex flex-col gap-4 mt-4 mb-4">
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                                <thead className="bg-gray-50 dark:bg-white/5">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/4">Criteria</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[120px]">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-white/10">
                                    {dataToRender.map((item: any, idx: number) => {
                                        const criteriaText = item.criteria || item.criterion || item.item || item.name || "Criteria";
                                        const statusText = item.status || item.result || item.conclusion || "Unknown";
                                        const reasonText = item.reason || item.explanation || item.details || item.evidence || "No explanation provided.";
                                        
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 align-top font-semibold">{criteriaText}</td>
                                                <td className="px-4 py-3 text-sm align-top whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${statusText === 'Met' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
                                                        {statusText}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 align-top whitespace-pre-wrap">{reasonText}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {parsed.conclusion && (
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg p-5">
                                <h3 className="text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Conclusion
                                </h3>
                                <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed whitespace-pre-wrap">
                                    {parsed.conclusion}
                                </p>
                            </div>
                        )}
                    </div>
                );
            }
        } catch (e) {
            // Parsing failed, it's probably normal text! Fallback below.
        }

        return (
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown>{typeof content === 'string' ? content : (content ? JSON.stringify(content, null, 2) : '')}</ReactMarkdown>
            </div>
        );
    };

    const handleDepartmentReviewSubmit = async (decisionMode: 'Save' | 'Reject' | 'Accept') => {
        if (!userProfile?.department) {
            alert("Your account is not assigned to a department.");
            return;
        }

        setIsSaving(decisionMode);
        try {
            const payload = {
                reviewer_id: userProfile.id,
                department: userProfile.department,
                evaluation: evaluation,
                reason: reason,
                decision: decisionMode === 'Save' ? null : decisionMode
            };

            const res = await fetch(`/api/admin/submissions/${submission.id}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                alert(`Successfully recorded your review for ${userProfile.department}!`);
                fetchReviews(submission.id); // Refresh review data
            } else {
                alert('Failed to save review: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Failed to submit review. Try again.');
        } finally {
            setIsSaving(null);
        }
    };

    const handleJuryAssignmentSubmit = async () => {
        if (assignedJuryIds.length === 0) {
            alert('Please select at least one Jury member.');
            return;
        }
        setIsSavingAssignments(true);
        try {
            const response = await fetch(`/api/admin/submissions/${resolvedParams.id}/assignments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                juryIds: assignedJuryIds,
                scheduledDate,
                scheduledTime
            }),
        });


            if (!response.ok) throw new Error('Failed to save assignments');

            alert('Jury assigned successfully! Email notifications have been sent.');
            setIsJuryModalOpen(false);
            await fetchAssignments(resolvedParams.id);
        } catch (err: any) {
            alert(err.message || 'Failed to update assignments');
        } finally {
            setIsSavingAssignments(false);
        }
    };

    const handleAdminReviewSubmit = async (decision: 'Accept' | 'Reject' | 'Save') => {
        if (decision !== 'Save' && !confirm(`Are you sure you want to ${decision} this startup? This will override all department reviews and finalize the application immediately.`)) {
            return;
        }
        
        setIsSaving(`admin_${decision}`);
        try {
            // 1. Save the review as 'Admin'
            const reviewPayload = {
                reviewer_id: userProfile.id,
                department: 'Admin',
                evaluation: adminEvaluation,
                reason: adminReason,
                decision: decision === 'Save' ? null : decision
            };

            const reviewRes = await fetch(`/api/admin/submissions/${submission.id}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reviewPayload)
            });

            if (!reviewRes.ok) throw new Error('Failed to save Admin review');

            // 2. Finalize the submission ONLY if it's Accept or Reject
            if (decision !== 'Save') {
                const updates = {
                    is_internal_reviewed: true,
                    is_jury_accepted: null,
                    is_rejected: decision === 'Reject',
                    needs_admin_review: false
                };

                const finalizeRes = await fetch(`/api/admin/submissions/${submission.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });

                const data = await finalizeRes.json();
                if (!finalizeRes.ok) throw new Error(data.error || 'Failed to finalize submission');

                if (data.email_error) {
                    alert(`Admin Review recorded, but email failed: ${data.email_error}`);
                } else {
                    alert(`Admin Review recorded: Submission ${decision}ed successfully and email sent!`);
                }
            } else {
                alert('Admin review notes saved successfully!');
            }
            
            fetchData(submission.id); // Refresh main info
            fetchReviews(submission.id);
        } catch (err: any) {
            alert(err.message || 'Failed to submit Admin review.');
        } finally {
            setIsSaving(null);
        }
    };

    const handleFinalDecisionSubmit = async (action: 'accept' | 'reject' | 'admin_review') => {
        setIsSaving(action);
        try {
            const updates: any = {};

            if (action === 'accept') {
                updates.is_internal_reviewed = true;
                updates.is_rejected = false;
                updates.needs_admin_review = false;
            } else if (action === 'reject') {
                updates.is_internal_reviewed = true;
                updates.is_rejected = true;
                updates.needs_admin_review = false;
            } else if (action === 'admin_review') {
                updates.is_internal_reviewed = false;
                updates.is_rejected = false;
                updates.needs_admin_review = true;
            }

            const res = await fetch(`/api/admin/submissions/${submission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            const data = await res.json();
            if (data.success) {
                setSubmission({ ...submission, ...updates });
                let msg = '';
                if (action === 'accept') msg = 'Startup formally Accepted and passed to Jury!';
                else if (action === 'reject') msg = 'Startup officially Rejected.';
                else if (action === 'admin_review') {
                    msg = 'Flagged for Review with Admin.';
                    // Trigger email notification to admins background
                    fetch(`/api/admin/submissions/${submission.id}/notify-admin`, { method: 'POST' })
                        .catch(err => console.error('Silent Notification Error:', err));
                }
                alert(msg);
            } else {
                alert('Failed to save final decision');
            }
        } catch (err) {
            alert('Failed to submit final decision. Try again.');
        } finally {
            setIsSaving(null);
        }
    };

    const handleAdminJuryDecision = async (decision: 'Accept' | 'Reject') => {
        const confirmMsg = decision === 'Accept' 
            ? "Are you sure you want to ACCEPT this startup? This will trigger the next phase (Financial Verification)."
            : "Are you sure you want to REJECT this startup after jury review?";
        
        if (!confirm(confirmMsg)) return;

        setIsSaving(`admin_jury_${decision}`);
        try {
            const payload: any = {
                is_jury_reviewed: true // Ensure it's marked as reviewed
            };

            if (decision === 'Accept') {
                payload.is_jury_accepted = true;
                payload.is_rejected = false;
                payload.admin_jury_decision = 'ACCEPTED';
            } else {
                payload.is_jury_accepted = false;
                payload.is_rejected = true;
                payload.admin_jury_decision = 'REJECTED';
            }

            const res = await fetch(`/api/admin/submissions/${submission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setSubmission(data.submission);
                alert(`Startup ${decision === 'Accept' ? 'ACCEPTED' : 'REJECTED'} successfully.`);
            } else {
                alert('Failed to save Admin decision');
            }
        } catch (err) {
            alert('An error occurred. Please try again.');
        } finally {
            setIsSaving(null);
        }
    };

    const handleFinancialDecision = async (status: 'VERIFIED' | 'INCORRECT') => {
        const confirmMsg = status === 'VERIFIED' 
            ? "Mark these financials as VERIFIED?" 
            : "Mark these financials as INCORRECT?";
        
        if (!confirm(confirmMsg)) return;

        setIsSaving(`financial_${status}`);
        try {
            const res = await fetch(`/api/admin/submissions/${submission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ financial_status: status })
            });

            if (res.ok) {
                const data = await res.json();
                setSubmission(data.submission);
                alert(`Payment status marked as ${status}.`);
            } else {
                alert('Failed to update financial status.');
            }
        } catch (err) {
            alert('An error occurred.');
        } finally {
            setIsSaving(null);
        }
    };

    if (isLiveMode) {
        let webZoomUrl = '';
        const isJury = userProfile?.role?.toUpperCase() === 'JURY';
        const isStaff = userProfile?.role?.toUpperCase() === 'ADMIN' || userProfile?.role?.toUpperCase() === 'INTERNAL_TEAM';
        
        // Parse Meeting ID and Password
        let meetingId = '';
        let password = '';
        try {
            const urlObj = new URL(scheduledZoomLink);
            const pathParts = urlObj.pathname.split('/');
            meetingId = pathParts[pathParts.length - 1];
            password = urlObj.searchParams.get('pwd') || '';
        } catch (e) {
            console.error("Invalid Zoom Link");
        }

        // Robust URL Building
        const url = new URL(`https://zoom.us/wc/join/${meetingId}`);
        if (password) url.searchParams.set('pwd', password);
        if (isStaff && zakToken && !zakToken.startsWith('Error')) {
            url.searchParams.set('zak', zakToken);
            url.searchParams.set('role', '1');
            url.searchParams.set('action', 'start'); // FORCE START MODE
            if (currentUserEmail) {
                url.searchParams.set('email', currentUserEmail);
            }
        }
        if (userProfile?.name) {
            url.searchParams.set('un', userProfile.name);
        }
        webZoomUrl = url.toString();
        
        return (
            <div className="fixed inset-0 z-[100] bg-white dark:bg-[#0a0a0c] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header (Different for Staff vs Jury) */}
                <div className="h-16 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-6 bg-white dark:bg-[#0a0a0c] shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center">
                            <Video className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-black dark:text-white uppercase tracking-tight">
                                {isStaff ? 'Moderator Mode' : 'Live Evaluation'}: <span className="text-indigo-600">{submission?.company_name}</span>
                            </h1>
                            {isStaff && hostKey && !hostKey.startsWith('Error') && (
                                <div className="space-y-1 mt-0.5">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                        Host Key: {hostKey}
                                    </p>
                                    <p className="text-[9px] text-gray-400 font-medium">If Sharing is disabled, click 'Participants' → 'Claim Host' and enter the key above.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleRegenerateMeeting}
                            disabled={isRefetchingReviews}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl font-bold text-xs hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all border border-amber-100 dark:border-amber-500/20 shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefetchingReviews ? 'animate-spin' : ''}`} /> Fix/Regenerate Meeting
                        </button>

                        <button 
                            onClick={() => {
                                const url = window.location.origin;
                                alert(`FIX CAMERA BLOCK:\n\n1. Copy this: chrome://flags/#unsafely-treat-insecure-origin-as-secure\n2. Paste it in a new tab.\n3. Add "${url}" to the text box.\n4. Set it to "Enabled".\n5. Relaunch your browser.\n\nThis will allow your camera to work inside the application!`);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl font-bold text-xs hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all border border-amber-100 dark:border-amber-500/20 shadow-sm"
                        >
                            <AlertTriangle className="w-4 h-4" /> Camera Not Working?
                        </button>

                        <button 
                            onClick={() => window.open(webZoomUrl, '_blank')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100 dark:border-indigo-500/20 shadow-sm"
                        >
                            <ExternalLink className="w-4 h-4" /> New Tab
                        </button>

                        <button 
                            onClick={() => {
                                const zoomAppUrl = `zoommtg://zoom.us/join?action=join&confno=${meetingId}&pwd=${password}&role=1&uname=${encodeURIComponent(userProfile?.name || 'User')}`;
                                window.location.href = zoomAppUrl;
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all border border-emerald-100 dark:border-emerald-500/20 shadow-sm"
                        >
                            <Video className="w-4 h-4" /> Open Zoom App
                        </button>

                        <button 
                            onClick={() => setIsLiveMode(false)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-100 dark:border-red-500/20"
                        >
                            <X className="w-4 h-4" /> Exit
                        </button>
                    </div>
                </div>

                {typeof window !== 'undefined' && window.location.protocol !== 'https:' && isStaff && (
                    <div className="px-6 py-2 bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        BROWSER ALERT: Video/Audio and Screen Sharing are BLOCKED by your browser because you are not using HTTPS. Use "New Tab" or "Open Zoom App" instead.
                    </div>
                )}

                <div className="flex-1 flex overflow-hidden">
                    {/* Zoom Panel */}
                    <div className="flex-1 bg-black relative">
                        <iframe
                            src={webZoomUrl}
                            allow="camera *; microphone *; fullscreen; speaker; display-capture; clipboard-read; clipboard-write; encrypted-media"
                            className="w-full h-full border-none"
                            title="Zoom Meeting"
                        />
                    </div>

                    {/* Jury Panel - ONLY for Jury role */}
                    {isJury && (
                        <div className="w-[450px] border-l border-gray-200 dark:border-white/10 flex flex-col bg-white dark:bg-[#0a0a0c] animate-in slide-in-from-right duration-500">
                            <div className="p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Gavel className="w-4 h-4 text-indigo-500" />
                                    <h2 className="text-sm font-bold text-black dark:text-white">Jury Scorecard</h2>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                    {/* Evaluation Criteria Block */}
                                    {EVALUATION_CRITERIA.map((criterion) => {
                                        const myEval = evaluations.find(e => e.jury_id === userProfile.id);
                                        const currentScore = myEval?.scores?.[criterion.id] || 0;
                                        const currentNote = myEval?.notes?.[criterion.id] || '';

                                        return (
                                            <div key={criterion.id} className="mb-8 last:mb-0">
                                                <div className="flex items-center justify-between mb-3">
                                                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                        {criterion.label}
                                                    </label>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map((score) => (
                                                            <button
                                                                key={score}
                                                                onClick={() => {
                                                                    const newScores = { ...(myEval?.scores || {}), [criterion.id]: score };
                                                                    handleSaveEvaluation(newScores, myEval?.notes || {}, calculateTotalScore(newScores));
                                                                }}
                                                                className={`w-7 h-7 rounded-lg border text-[10px] font-black transition-all ${Number(currentScore) === score ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'border-gray-200 dark:border-white/10 text-gray-400'}`}
                                                            >
                                                                {score}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <textarea
                                                    placeholder="Notes..."
                                                    defaultValue={currentNote}
                                                        onBlur={(e) => {
                                                            const newNotes = { ...(myEval?.notes || {}), [criterion.id]: e.target.value };
                                                            handleSaveEvaluation(myEval?.scores || {}, newNotes, calculateTotalScore(myEval?.scores));
                                                        }}
                                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-lg p-2.5 text-[11px] min-h-[60px] focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>
                                        );
                                    })}

                                    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/5 space-y-8">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Additional Questions</h3>
                                        {ADDITIONAL_QUESTIONS.map((q) => {
                                            const myEval = evaluations.find(e => e.jury_id === userProfile.id);
                                            const currentScore = myEval?.scores?.[q.id] || 0;
                                            const currentNote = myEval?.notes?.[q.id] || '';
                                            const hasScore = !['investment_type', 'market_access'].includes(q.id);

                                            return (
                                                <div key={q.id} className="space-y-3">
                                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-200">{q.label}</label>
                                                    {hasScore && (
                                                        <div className="flex gap-1.5">
                                                            {[1, 2, 3, 4, 5].map((score) => (
                                                                <button
                                                                    key={score}
                                                                    onClick={() => {
                                                                        const newScores = { ...(myEval?.scores || {}), [q.id]: score };
                                                                        handleSaveEvaluation(newScores, myEval?.notes || {}, calculateTotalScore(newScores));
                                                                    }}
                                                                    className={`w-8 h-8 rounded-lg border text-[10px] font-black transition-all ${Number(currentScore) === score ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-gray-200 dark:border-white/10 text-gray-400'}`}
                                                                >
                                                                    {score}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <textarea
                                                        placeholder="Notes..."
                                                        defaultValue={currentNote}
                                                        onBlur={(e) => {
                                                            const newNotes = { ...(myEval?.notes || {}), [q.id]: e.target.value };
                                                            handleSaveEvaluation(myEval?.scores || {}, newNotes, calculateTotalScore(myEval?.scores));
                                                        }}
                                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-lg p-2.5 text-[11px] min-h-[60px] focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center h-14 shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Score</span>
                                <span className="text-xl font-black">{evaluations.find(e => e.jury_id === userProfile.id)?.total_score || 0}/65</span>
                            </div>

                            <div className="p-4 bg-white dark:bg-[#0a0a0c] border-t border-gray-200 dark:border-white/10">
                                <button
                                    onClick={handleFinalEvaluationSubmit}
                                    disabled={isSubmittingEvaluation || submission?.is_jury_reviewed}
                                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-xl shadow-indigo-600/10 active:scale-[0.98] ${submission?.is_jury_reviewed ? 'bg-emerald-500 text-white cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'}`}
                                >
                                    {isSubmittingEvaluation ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : submission?.is_jury_reviewed ? (
                                        <>
                                            <CheckCircle className="w-5 h-5" /> Evaluation Submitted
                                        </>
                                    ) : (
                                        <>
                                            <Gavel className="w-5 h-5" /> Submit Evaluation
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const NavigationHeader = (
        <header className="flex items-center justify-between mb-8 animate-fade-up shrink-0 relative z-10">
            <div className="flex items-center gap-4">
                <ThemeToggle />
                <button onClick={() => router.back()} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition text-black dark:text-gray-400 hover:text-black dark:text-white cursor-pointer">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                {!isPaymentContext && (
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            {isInternalReviewPage ? 'Internal Review Summary' : (isJuryReviewPage || activeTab === 'jury_eval') ? 'Jury Evaluation Summary' : 'Startup Analysis'}
                        </h1>

                    </div>
                )}
            </div>


            <div className="flex items-center gap-3">
                {submission?.is_onboarded ? (
                    <button
                        onClick={handleWithdraw}
                        disabled={isWithdrawing}
                        className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
                    >
                        {isWithdrawing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Withdraw Application
                    </button>
                ) : (
                    <>
                        {(() => {
                            const formData = submission?.form_data || {};
                            const deckKey = Object.keys(formData).find(k => 
                                ['pitch deck', 'presentation', 'deck', 'pitch-deck', 'pitchdeck'].some(kw => k.toLowerCase().trim().replace(/[^a-z0-9]/g, '').includes(kw.toLowerCase().trim().replace(/[^a-z0-9]/g, '')))
                            );
                            const deckUrl = submission?.file_url || (deckKey ? String(formData[deckKey]) : null);
                            
                            if (deckUrl && (deckUrl.startsWith('http') || deckUrl.startsWith('https'))) {
                                return (
                                    <button
                                        onClick={() => setShowPitchDeck(!showPitchDeck)}
                                        className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg ${showPitchDeck ? 'bg-indigo-600 text-white shadow-indigo-600/20' : 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white'}`}
                                    >
                                        <Layout className="w-4 h-4" /> {showPitchDeck ? 'Close Deck' : 'View Pitch Deck'}
                                    </button>
                                );
                            }
                            return null;
                        })()}
                        
                        {scheduledZoomLink && !isAIAnalysisPage && !submission?.is_jury_reviewed && (userProfile?.role === 'JURY' || userProfile?.role === 'ADMIN' || userProfile?.role === 'INTERNAL_TEAM') && (
                            <button
                                onClick={() => window.open(scheduledZoomLink, '_blank')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-6 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                <Video className="w-4 h-4" /> Join Zoom Meeting
                            </button>
                        )}
                        
                        {/* Removed Top Accept/Reject Buttons as requested */}
                        
                        {!isPaymentContext && !isAIAnalysisPage && (userProfile?.role?.toUpperCase() === 'ADMIN' || userProfile?.role?.toUpperCase() === 'INTERNAL_TEAM') && 
                            (submission?.is_internal_reviewed || userProfile?.role?.toUpperCase() === 'ADMIN') && !submission?.is_rejected && !submission?.admin_jury_decision && (
                            <button
                                onClick={() => setIsJuryModalOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
                            >
                                <Users className="w-4 h-4" /> {assignedJuryIds.length > 0 ? 'Edit Jury Assignment' : 'Assign Jury'}
                            </button>
                        )}
                    </>



                )}
            </div>
        </header>
    );

    // === FINANCIAL VERIFICATION-ONLY VIEW ===
    const isFinancialContext = searchParams.get('from') === 'financial_verification';
    if (isFinancialContext && submission) {
        const currentFinancialStatus = submission.financial_status;
        const isVerified = currentFinancialStatus === 'VERIFIED';
        const isIncorrect = currentFinancialStatus === 'INCORRECT';

        const handleFinancialDecision = async (status: 'VERIFIED' | 'INCORRECT') => {
            setIsSaving(status);
            try {
                const res = await fetch(`/api/admin/submissions/${resolvedParams.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ financial_status: status }),
                });
                const data = await res.json();
                if (data.success) {
                    setSubmission((prev: any) => ({ ...prev, financial_status: status }));
                } else {
                    alert('Failed to update financial status.');
                }
            } catch (err) {
                alert('An error occurred. Please try again.');
            } finally {
                setIsSaving(null);
            }
        };

        return (
            <div className="min-h-screen px-6 md:px-12 py-8 relative flex flex-col bg-[#f8fafc] dark:bg-[#08080a] selection:bg-indigo-500/30">
                <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 dark:opacity-20 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px]" />
                </div>

                <header className="flex items-center justify-between mb-10 animate-fade-up shrink-0 relative z-10">
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button onClick={() => router.back()} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition text-black dark:text-gray-400">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Financials Verification</h1>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{submission.company_name}</p>
                            </div>
                        </div>
                    </div>
                    {currentFinancialStatus && (
                        <span className={`text-xs font-black px-4 py-2 rounded-xl border uppercase tracking-widest ${isVerified ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : isIncorrect ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                            {isVerified ? '✓ Verified' : isIncorrect ? '✗ Incorrect' : currentFinancialStatus}
                        </span>
                    )}
                </header>

                <div className="w-full max-w-[1600px] mx-auto animate-fade-up relative z-10 space-y-4">
                    {/* Documents Card — Categorized by type */}
                    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[24px] overflow-hidden shadow-2xl shadow-indigo-500/5">
                        {/* Card Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                    <Briefcase className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Verification Package</p>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{submission.company_name}</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                        Received {financialDocs[0]?.created_at ? new Date(financialDocs[0].created_at).toLocaleString() : '—'}
                                    </p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase rounded-xl border tracking-widest ${isVerified ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : isIncorrect ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                <CheckCircle2 className="w-3 h-3" />
                                Status: {isVerified ? 'Verified' : isIncorrect ? 'Incorrect' : 'Pending'}
                            </div>
                        </div>

                        {/* View Switcher Tabs */}
                        <div className="px-8 pt-6 flex gap-3">
                            <button 
                                onClick={() => router.push('?from=financial_verification')}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isFinancialContext ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-indigo-600'}`}
                            >
                                Financial Documents
                            </button>
                        </div>

                        {/* Document Grid */}
                        <div className="p-8">
                            {loadingFinancials ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-white/5 animate-pulse rounded-2xl" />)}
                                </div>
                            ) : financialDocs.length > 0 && financialDocs[0]?.form_response_data ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {Object.entries(financialDocs[0].form_response_data || {}).map(([category, paths]: [string, any]) => (
                                        <div key={category} className="space-y-3">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Layout className="w-3.5 h-3.5 text-indigo-500" /> {category}
                                            </h4>
                                            <div className="space-y-2">
                                                {Array.isArray(paths) && paths.length > 0 ? paths.map((path: string, pIdx: number) => {
                                                    const fileName = path.split('/').pop() || `File ${pIdx + 1}`;
                                                    return (
                                                        <button
                                                            key={pIdx}
                                                            onClick={() => getSignedUrl(path)}
                                                            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-indigo-500/10 border border-gray-100 dark:border-white/10 rounded-2xl transition-all group shadow-sm hover:shadow-md"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                                                                    <FileText className="w-4 h-4 text-indigo-500 group-hover:text-white" />
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate uppercase tracking-tight">{fileName}</span>
                                                            </div>
                                                            <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors shrink-0 ml-2" />
                                                        </button>
                                                    );
                                                }) : (
                                                    <div className="flex items-center gap-2 p-4 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 italic text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                        <AlertCircle className="w-3.5 h-3.5" /> No files available
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : financialDocs.length > 0 ? (
                                /* Fallback: flat list if no form_response_data structure */
                                <div className="space-y-3">
                                    {financialDocs.map((doc, idx) => {
                                        const displayName = doc.file_name || doc.original_name || (doc.file_path ? doc.file_path.split('/').pop() : null) || `Document ${idx + 1}`;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => doc.file_url ? window.open(doc.file_url, '_blank') : getSignedUrl(doc.file_path)}
                                                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group text-left"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg group-hover:bg-indigo-600 transition-colors shrink-0">
                                                        <FileText className="w-4 h-4 text-indigo-500 group-hover:text-white" />
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate uppercase">{displayName}</p>
                                                </div>
                                                <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors shrink-0 ml-2" />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16 flex flex-col items-center gap-3 opacity-40">
                                    <FileText className="w-10 h-10" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No documents uploaded yet</p>
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Admin Decision Buttons */}
                    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[24px] p-6 shadow-xl shadow-indigo-500/5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Admin Decision</p>

                        {/* Already decided — show locked state */}
                        {currentFinancialStatus ? (
                            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isVerified ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isVerified ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                    {isVerified ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-black uppercase tracking-widest ${isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {isVerified ? 'Financials Correct' : 'Financials Incorrect'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                                        {isVerified ? 'Financials link has been sent to the startup.' : 'Startup has been notified to resubmit.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleFinancialDecision(isVerified ? 'INCORRECT' : 'VERIFIED')}
                                    disabled={isSaving !== null}
                                    className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 uppercase tracking-widest transition-colors disabled:opacity-50"
                                >
                                    {isSaving !== null ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Change'}
                                </button>
                            </div>
                        ) : (
                            /* Not yet decided — show both action buttons */
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleFinancialDecision('VERIFIED')}
                                    disabled={isSaving !== null}
                                    className="flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {isSaving === 'VERIFIED' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Financials Correct
                                </button>
                                <button
                                    onClick={() => handleFinancialDecision('INCORRECT')}
                                    disabled={isSaving !== null}
                                    className="flex items-center justify-center gap-2 py-3.5 px-4 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                                >
                                    {isSaving === 'INCORRECT' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Financials Incorrect
                                </button>
                            </div>
                        )}
                    </div>

                    {submission.form_data?.__mou_status === 'PENDING_REVIEW' && (
                        <div className="w-full max-w-5xl mx-auto mt-8 animate-fade-up">
                            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-amber-500/30 rounded-[24px] p-8 shadow-2xl shadow-amber-500/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-amber-500" />
                                            </div>
                                            <h2 className="text-md font-bold text-black dark:text-white uppercase tracking-tight">MOU Preparation & Review</h2>
                                        </div>

                                        <div className="flex bg-indigo-50 dark:bg-indigo-500/10 p-1 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                                            <button 
                                                onClick={() => setMouMode('FIELDS')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mouMode === 'FIELDS' ? 'bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white shadow-md' : 'text-gray-400 hover:text-indigo-500'}`}
                                            >
                                                Fields View
                                            </button>
                                            <button 
                                                onClick={() => setMouMode('EDITOR')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mouMode === 'EDITOR' ? 'bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white shadow-md' : 'text-gray-400 hover:text-indigo-500'}`}
                                            >
                                                Live Editor
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {mouMode === 'EDITOR' && (
                                            <button 
                                                onClick={handleSaveTemplateText}
                                                disabled={isSavingTemplate}
                                                className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all"
                                            >
                                                {isSavingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            </button>
                                        )}
                                        <button 
                                            onClick={handleDownloadMasterTemplate}
                                            className="p-2 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-indigo-600 rounded-lg transition-all"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </button>
                                        <input 
                                            type="file" 
                                            accept=".docx"
                                            onChange={handleUpdateMasterTemplate}
                                            className="hidden" 
                                            id="master-template-upload"
                                        />
                                        <label 
                                            htmlFor="master-template-upload"
                                            className="p-2 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-emerald-600 rounded-lg cursor-pointer transition-all"
                                        >
                                            {isUpdatingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                        </label>
                                    </div>
                                </div>

                                {mouMode === 'FIELDS' ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Startup Name</label>
                                                        <input 
                                                            type="text" 
                                                            defaultValue={mouDraft?.company_name || submission.company_name}
                                                            onChange={(e) => setMouDraft({...mouDraft, company_name: e.target.value})}
                                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Founder Name</label>
                                                        <input 
                                                            type="text" 
                                                            defaultValue={mouDraft?.founder || submission.form_data?.__mou_draft?.founder}
                                                            onChange={(e) => setMouDraft({...mouDraft, founder: e.target.value})}
                                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company Address</label>
                                                        <textarea 
                                                            defaultValue={mouDraft?.address || submission.form_data?.__mou_draft?.address}
                                                            onChange={(e) => setMouDraft({...mouDraft, address: e.target.value})}
                                                            rows={3}
                                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2 p-6 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">Full Document Control</h4>
                                                            <p className="text-[10px] text-gray-500 mt-1">Download the draft, edit locally, and upload back.</p>
                                                        </div>
                                                        <button 
                                                            onClick={handleDownloadDraft}
                                                            className="px-4 py-2 bg-white dark:bg-white/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2"
                                                        >
                                                            <Download className="w-3 h-3" /> Download Draft
                                                        </button>
                                                    </div>
                                                    <div className="pt-4 border-t border-indigo-100 dark:border-indigo-500/10">
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex items-center gap-4">
                                                                <input type="file" accept=".docx,.pdf" onChange={handleFileChange} className="hidden" id="custom-mou-upload" />
                                                                <label htmlFor="custom-mou-upload" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:bg-indigo-700 flex items-center gap-2">
                                                                    <Upload className="w-3 h-3" /> {customMOU ? 'Change File' : 'Upload Final'}
                                                                </label>
                                                                {customMOU && <span className="text-[10px] font-bold text-emerald-500">{customMOU.name}</span>}
                                                            </div>
                                                            <div className="flex items-start gap-2 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                                                                <AlertCircle className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                                                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                                                    <strong className="text-indigo-600 dark:text-indigo-400">Pro Tip:</strong> For perfect branding and logos, upload your MOU as a <strong className="text-gray-900 dark:text-white">PDF</strong>.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                                    <p className="text-[11px] text-gray-500 italic">Review details on the right. "Send MOU" will generate and email the document.</p>
                                                    <button 
                                                        onClick={handleSendMOU}
                                                        disabled={isSendingMOU}
                                                        className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2"
                                                    >
                                                        {isSendingMOU ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                                        {customMOU ? 'Send Custom MOU' : 'Send MOU'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Live Preview Pane */}
                                            <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-8 border border-gray-100 dark:border-white/5 max-h-[800px] overflow-y-auto">
                                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-white/5">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Preview</span>
                                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase">Live Sync</span>
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-300 font-serif leading-relaxed whitespace-pre-wrap space-y-4">
                                                    {getProcessedContent()}
                                                </div>
                                            </div>
                                        </div>
                                ) : (
                                    <div className="bg-white dark:bg-white/5 border border-amber-500/20 rounded-2xl p-8 space-y-6 shadow-sm">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {['company_name', 'founder', 'address', 'date'].map(v => (
                                                <button key={v} onClick={() => insertVariable(v)} className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-[10px] font-bold rounded-lg hover:bg-amber-500/10 hover:text-amber-600 transition-all">
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                        <div className={`transition-all duration-500 ${isMaximized ? 'fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-xl p-8 overflow-y-auto' : 'w-full'}`}>
                                            {isMaximized && (
                                                <button 
                                                    onClick={() => setIsMaximized(false)}
                                                    className="fixed top-8 right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-[110]"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            )}
                                            
                                            <div className={`bg-white dark:bg-white shadow-2xl mx-auto transition-all duration-500 ${isMaximized ? 'max-w-4xl min-h-[1600px] p-20' : 'w-full min-h-[1200px] p-16'} rounded-sm border border-gray-200 relative`}>
                                                <div className="absolute top-4 right-4 flex items-center gap-2 no-print">
                                                    <button 
                                                        onClick={() => setIsMaximized(!isMaximized)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-all"
                                                        title={isMaximized ? "Exit Fullscreen" : "Fullscreen Focus"}
                                                    >
                                                        {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                    </button>
                                                </div>

                                                <textarea 
                                                    value={editorContent}
                                                    onChange={(e) => setEditorContent(e.target.value)}
                                                    className="w-full h-full min-h-[1000px] bg-transparent border-none focus:ring-0 text-gray-900 font-serif text-lg leading-loose resize-none overflow-hidden"
                                                    placeholder="Start typing your MOU here..."
                                                    style={{ height: 'auto' }}
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        target.style.height = 'auto';
                                                        target.style.height = target.scrollHeight + 'px';
                                                    }}
                                                />
                                            </div>

                                            {!isMaximized && (
                                                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={handleSaveTemplateText}
                                                            disabled={isSavingTemplate}
                                                            className="px-6 py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-sm hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                                                        >
                                                            {isSavingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                            Save Template
                                                        </button>
                                                        <p className="text-[11px] text-gray-500 italic">Save as the master template for all future MOUs.</p>
                                                    </div>
                                                    <button 
                                                        onClick={handleSendMOUText}
                                                        disabled={isSendingMOU}
                                                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2"
                                                    >
                                                        {isSendingMOU ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                        Finalize & Send MOU
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }


    // === PAYMENT-ONLY VIEW ===
    if (isPaymentContext && submission) {
        return (
            <div className="min-h-screen px-6 md:px-12 py-8 relative flex flex-col bg-[#f8fafc] dark:bg-[#08080a] selection:bg-indigo-500/30">
                <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 dark:opacity-20 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px]" />
                </div>

                {/* Minimal Nav */}
                <header className="flex items-center justify-between mb-10 animate-fade-up shrink-0 relative z-10">
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button onClick={() => router.back()} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition text-black dark:text-gray-400">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Financials Verification</h1>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{submission.company_name}</p>
                            </div>
                        </div>
                    </div>
                    <span className={`text-xs font-black px-4 py-2 rounded-xl border uppercase tracking-widest ${submission.payment_status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                        {submission.payment_status || 'PENDING'}
                    </span>
                </header>

                {/* Payment Card — Now at Top */}
                <div className="w-full max-w-5xl mx-auto animate-fade-up relative z-10 mt-8">
                    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[24px] overflow-hidden shadow-2xl shadow-indigo-500/5">
                        {/* Card Header */}
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cohort Onboarding Fee</p>
                                <p className="text-4xl font-black text-gray-900 dark:text-white mt-2">₹ 2,500.00</p>
                            </div>
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${submission.payment_status === 'PAID' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                <CreditCard className={`w-8 h-8 ${submission.payment_status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`} />
                            </div>
                        </div>

                        {/* View Switcher Tabs */}
                        <div className="px-8 pt-6 flex gap-3">
                            <button 
                                onClick={() => router.push('?from=financial_verification')}
                                className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            >
                                Financial Documents
                            </button>
                        </div>

                        {/* Payment Details Grid */}
                        <div className="p-8 grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Startup Name</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{submission.company_name}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order Reference</p>
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 break-all">{submission.razorpay_order_id || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Financial Status</p>
                                <p className={`text-xs font-black uppercase ${submission.payment_status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>{submission.payment_status || 'PENDING'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Financial Method</p>
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Razorpay Secured</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tax</p>
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">GST Included</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Account Status</p>
                                <p className="text-xs font-black text-emerald-500">Good Standing</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Onboarded</p>
                                <p className={`text-xs font-black uppercase ${submission.is_onboarded ? 'text-emerald-500' : 'text-gray-400'}`}>{submission.is_onboarded ? 'Yes' : 'No'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MOU Section — Always show for admins in payment view */}
                {((submission.form_data?.__mou_status === 'PENDING_REVIEW') || (userProfile?.role?.toUpperCase() === 'ADMIN')) && (
                    <div className="w-full max-w-5xl mx-auto mt-8 animate-fade-up">
                        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-amber-500/30 rounded-[24px] p-8 shadow-2xl shadow-amber-500/5">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <h2 className="text-md font-bold text-black dark:text-white uppercase tracking-tight">MOU Preparation & Review</h2>
                                    </div>
                                </div>

                                {/* Template Management Buttons */}
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handleSyncTemplate}
                                        disabled={isSyncingTemplate}
                                        title="Sync from Master Word File"
                                        className="p-2 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-amber-500 rounded-lg transition-all"
                                    >
                                        {isSyncingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={handleDownloadMasterTemplate}
                                        title="Download current master template"
                                        className="p-2 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-indigo-600 rounded-lg transition-all"
                                    >
                                        <Archive className="w-4 h-4" />
                                    </button>
                                    <input 
                                        type="file" 
                                        accept=".docx" 
                                        onChange={handleUpdateMasterTemplate}
                                        className="hidden" 
                                        id="master-template-upload"
                                    />
                                    <label 
                                        htmlFor="master-template-upload"
                                        title="Update master template (.docx)"
                                        className="p-2 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-emerald-600 rounded-lg cursor-pointer transition-all"
                                    >
                                        {isUpdatingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    </label>
                                </div>
                            </div>

                            {/* Professional MOU Workflow (Manual Edit Mode) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Step 1: Download */}
                                <div className="bg-gray-50/50 dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                                        <Download className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Step 1</p>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Download Draft</h4>
                                    <p className="text-[11px] text-gray-500 mb-6">Get the Word file pre-filled with this startup's details.</p>
                                    <button 
                                        onClick={handleDownloadDraft}
                                        disabled={isGeneratingDraft}
                                        className="w-full py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isGeneratingDraft ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                                        Get Word File
                                    </button>
                                </div>

                                {/* Step 2: Upload */}
                                <div className="bg-gray-50/50 dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                                        <Upload className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Step 2</p>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Upload Final</h4>
                                    <p className="text-[11px] text-gray-500 mb-6">Upload the edited or signed MOU back to the system.</p>
                                    <input 
                                        type="file" 
                                        onChange={handleFileChange}
                                        className="hidden" 
                                        id="mou-final-upload"
                                        accept=".docx,.pdf"
                                    />
                                    <label 
                                        htmlFor="mou-final-upload"
                                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${customMOU ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}
                                    >
                                        <Upload className="w-3 h-3" />
                                        {customMOU ? 'File Ready' : 'Upload Final'}
                                    </label>
                                    {customMOU && <p className="text-[9px] text-emerald-500 font-bold mt-2 truncate w-full px-2">{customMOU.name}</p>}
                                </div>

                                {/* Step 3: Send */}
                                <div className="bg-gray-50/50 dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center mb-4">
                                        <ShieldCheck className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Step 3</p>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Send to Startup</h4>
                                    <p className="text-[11px] text-gray-500 mb-6">Securely email the finalized MOU to the founder.</p>
                                    <button 
                                        onClick={handleSendMOU}
                                        disabled={isSendingMOU}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSendingMOU ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                        Finalize & Send
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Internal Review Aside (Visible for Admins & Internal Team, hidden during Jury Eval)
    const InternalReviewAside = (userProfile?.role?.toUpperCase() === 'ADMIN' || userProfile?.role?.toUpperCase() === 'INTERNAL_TEAM') && activeTab !== 'jury_eval' && activeTab !== 'financials' && searchParams.get('from') !== 'jury_review' && !isPaymentContext && (!submission?.is_onboarded || isInternalReviewPage || isAIAnalysisPage) && (
        <aside className={`order-first lg:order-last ${isInternalReviewPage ? 'lg:col-span-3' : 'lg:col-span-1'} space-y-6 relative`}>

            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-6 flex flex-col gap-4 rounded-[24px] shadow-2xl shadow-indigo-500/5 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <div className="flex items-center gap-2 mb-2 pb-4 border-b border-gray-200/50 dark:border-white/5 justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-indigo-500" />
                        </div>
                        <h2 className="text-md font-bold text-black dark:text-white uppercase tracking-tight">
                            Reviews
                        </h2>
                    </div>
                    {isRefetchingReviews && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
                </div>

            {/* FINAL STATUS BANNER */}
            <div className="flex flex-col gap-2">
                {submission.is_withdrawn && (
                    <div className="p-3 rounded-lg flex items-center gap-2 text-sm font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                        <AlertTriangle className="w-4 h-4" /> STATUS: WITHDRAWN BY STARTUP
                    </div>
                )}
                {submission.is_internal_reviewed ? (
                    <div className="flex flex-col gap-2">
                        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${submission.is_rejected ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                            {submission.is_rejected ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            {submission.is_rejected ? 'INTERNAL DECISION: REJECTED' : 'INTERNAL DECISION: ACCEPTED'}
                        </div>
                        {!submission.is_rejected && (
                        <div className="flex flex-col gap-2">
                            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium border ${assignedJuryIds.length > 0 ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'}`}>
                                <Gavel className="w-4 h-4" /> 
                                JURY ALLOTMENT: {assignedJuryIds.length > 0 ? 'ASSIGNED' : 'PENDING'}
                            </div>
                            {assignedJuryIds.length > 0 && (
                                <div className="px-3 py-2 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-lg border border-indigo-100 dark:border-indigo-500/10">
                                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Assigned Jury:</p>
                                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                                        {assignedJuryIds.map(id => {
                                            const jury = juryMembers.find(m => m.id === id);
                                            return (
                                                <span key={id} className="text-[11px] font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                    <Users className="w-2.5 h-2.5 text-indigo-500" />
                                                    {jury?.name || 'Assigned Member'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    {(scheduledDate || scheduledTime) && (
                                        <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-500/10 flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                                            {scheduledDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(scheduledDate).toLocaleDateString()}</span>}
                                            {scheduledTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {scheduledTime}</span>}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>

            ) : submission.needs_admin_review ? (
                <div className="p-3 rounded-lg flex items-center gap-2 text-sm font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                    <Users className="w-4 h-4" /> STATUS: PENDING ADMIN REVIEW
                </div>
            ) : null}
            </div>

            <div className="flex flex-wrap bg-gray-100 dark:bg-white/5 rounded-lg p-1 mb-4 gap-1">
                {(['iPreneur', 'Digital', 'Investments', 'Admin'])
                    .filter(deptName => isInternalReviewPage || isAIAnalysisPage || (userProfile?.department?.toLowerCase() === deptName.toLowerCase()) || userProfile?.role === 'ADMIN' || reviews.some(r => r.department === 'Admin'))
                    .map((deptName) => {
                        const hasCompleted = reviews.some(r => r.department?.toLowerCase() === deptName.toLowerCase() && (r.decision === 'Accept' || r.decision === 'Reject'));
                        return (
                            <button
                                key={deptName}
                                onClick={() => setActiveDeptTab(deptName)}
                                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${activeDeptTab === deptName ? (deptName === 'Admin' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm' : 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm') : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                            >
                                {deptName}
                                {hasCompleted && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                            </button>
                        );
                    })}
            </div>

            <div className="flex flex-col gap-3">
                {(() => {
                    const deptName = activeDeptTab;
                    const deptReview = reviews.find(r => r.department?.toLowerCase() === deptName.toLowerCase());
                    const isMyDepartment = userProfile?.department?.toLowerCase() === deptName.toLowerCase();
                    const isAdminTab = userProfile?.role === 'ADMIN' && deptName === 'Admin';

                    if (isAdminTab) {
                        return (
                            <div className="rounded-lg flex flex-col gap-4 border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-4 transition-colors">
                                <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-500/20 pb-4 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-amber-500" />
                                        <h2 className="text-[14px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                            Admin Override Review
                                        </h2>
                                    </div>
                                    {deptReview && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${deptReview.decision === 'Accept' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                            {deptReview.decision} OVERRIDE
                                        </span>
                                    )}
                                </div>
                                
                                {deptReview ? (
                                    <>
                                        <div className="text-xs text-amber-800 dark:text-amber-200 flex flex-col gap-3 mt-2">
                                            <div className="flex items-center gap-1 mb-1">
                                                <span className="font-bold text-amber-900 dark:text-amber-100">Reviewer: </span>
                                                <span>{deptReview.submitter?.name || 'Unknown'} (Admin)</span>
                                            </div>
                                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded border border-amber-200/50 dark:border-amber-500/20">
                                                <span className="font-bold text-amber-900 dark:text-amber-100 block mb-1">Evaluation: </span>
                                                {deptReview.evaluation ? deptReview.evaluation : <span className="italic text-amber-600/70">None provided.</span>}
                                            </div>
                                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded border border-amber-200/50 dark:border-amber-500/20">
                                                <span className="font-bold text-amber-900 dark:text-amber-100 block mb-1">Reason: </span>
                                                {deptReview.reason ? deptReview.reason : <span className="italic text-amber-600/70">None provided.</span>}
                                            </div>
                                        </div>
                                        </>
                                    ) : !submission.is_internal_reviewed ? (
                                    <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-500/20 flex flex-col gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Evaluation</label>
                                            <textarea
                                                value={adminEvaluation}
                                                onChange={(e) => setAdminEvaluation(e.target.value)}
                                                placeholder="Write admin evaluation here..."
                                                className="w-full bg-white/50 dark:bg-black/20 border border-amber-200 dark:border-amber-500/20 rounded-md p-2 text-xs text-gray-900 dark:text-gray-100 placeholder-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[80px] resize-y"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Reason</label>
                                            <textarea
                                                value={adminReason}
                                                onChange={(e) => setAdminReason(e.target.value)}
                                                placeholder="Why this override?"
                                                className="w-full bg-white/50 dark:bg-black/20 border border-amber-200 dark:border-amber-500/20 rounded-md p-2 text-xs text-gray-900 dark:text-gray-100 placeholder-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[60px] resize-y"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => handleAdminReviewSubmit('Accept')}
                                                disabled={isSaving !== null}
                                                className="flex-1 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded transition-colors disabled:opacity-50 flex justify-center items-center gap-1 shadow-sm"
                                            >
                                                {isSaving === 'admin_Accept' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Accept
                                            </button>
                                            <button
                                                onClick={() => handleAdminReviewSubmit('Reject')}
                                                disabled={isSaving !== null}
                                                className="flex-1 py-1.5 bg-red-500 text-white text-xs font-bold rounded transition-colors disabled:opacity-50 flex justify-center items-center gap-1 shadow-sm"
                                            >
                                                {isSaving === 'admin_Reject' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Reject
                                            </button>
                                            <button
                                                onClick={() => handleAdminReviewSubmit('Save')}
                                                disabled={isSaving !== null}
                                                className="flex-1 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30 border border-amber-200 dark:border-amber-500/20 text-xs font-bold rounded transition-colors disabled:opacity-50 flex justify-center items-center gap-1"
                                            >
                                                {isSaving === 'admin_Save' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    }

                    return (
                        <div className={`rounded-lg border ${deptReview ? (deptReview.decision === 'Accept' ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5' : deptReview.decision === 'Reject' ? 'border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5' : 'border-gray-200 dark:border-gray-500/20 bg-gray-50/50 dark:bg-white/5') : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5'} p-4 flex flex-col gap-2 transition-colors`}>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                    {deptName} Review
                                    {isMyDepartment && <span className="text-[10px] bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">You</span>}
                                    {deptReview?.decision && (deptReview.decision === 'Accept' || deptReview.decision === 'Reject') && (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Completed</span>
                                    )}
                                </span>
                                {deptReview?.decision ? (
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${deptReview.decision === 'Accept' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                        {deptReview.decision}
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 italic uppercase">Pending...</span>
                                )}
                            </div>

                            {deptReview && (
                                <div className="text-xs text-gray-600 dark:text-gray-300 flex flex-col gap-2 mt-2">
                                    <div className="flex items-center gap-1 mb-1">
                                        <span className="font-bold text-gray-900 dark:text-white">Reviewer: </span>
                                        <span>{deptReview.submitter?.name || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-700 dark:text-gray-200">Evaluation: </span>
                                        {deptReview.evaluation ? deptReview.evaluation : <span className="italic text-gray-400">None provided.</span>}
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-700 dark:text-gray-200">Reason: </span>
                                        {deptReview.reason ? deptReview.reason : <span className="italic text-gray-400">None provided.</span>}
                                    </div>
                                </div>
                            )}

                            {isMyDepartment && !submission.is_internal_reviewed && (!deptReview || (deptReview.decision !== 'Accept' && deptReview.decision !== 'Reject')) ? (
                                <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/5 flex flex-col gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Evaluation</label>
                                        <textarea
                                            value={evaluation}
                                            onChange={(e) => setEvaluation(e.target.value)}
                                            placeholder={`Write ${deptName} evaluation here...`}
                                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md p-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-y"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reason</label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder={`Why was this selected/rejected?`}
                                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md p-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px] resize-y"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <button
                                            onClick={() => handleDepartmentReviewSubmit('Accept')}
                                            disabled={isSaving !== null}
                                            className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold rounded transition-colors disabled:opacity-50 flex justify-center items-center gap-1"
                                        >
                                            {isSaving === 'Accept' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Accept
                                        </button>
                                        <button
                                            onClick={() => handleDepartmentReviewSubmit('Reject')}
                                            disabled={isSaving !== null}
                                            className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 text-xs font-bold rounded transition-colors disabled:opacity-50 flex justify-center items-center gap-1"
                                        >
                                            {isSaving === 'Reject' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Reject
                                        </button>
                                        <button
                                            onClick={() => handleDepartmentReviewSubmit('Save')}
                                            disabled={isSaving !== null}
                                            className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold rounded transition-colors disabled:opacity-50 flex justify-center items-center gap-1"
                                        >
                                            {isSaving === 'Save' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                                        </button>
                                    </div>
                                </div>
                            ) : isMyDepartment && !submission.is_internal_reviewed && deptReview && (deptReview.decision === 'Accept' || deptReview.decision === 'Reject') && (
                                <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/5 text-center">
                                    <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-lg p-3">
                                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                                            <CheckCircle className="w-3.5 h-3.5" /> Review Completed
                                        </p>
                                        <p className="text-[9px] text-emerald-500/70 dark:text-emerald-400/50 mt-1">
                                            Your department has already submitted a final decision for this startup.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* FINAL DECISION BLOCK - Appears only when mandatory reviews (iPreneur & Investments) exist and no final decision has been made yet */}
            {userProfile?.role !== 'ADMIN' && userProfile?.department === 'iPreneur' && !submission.is_internal_reviewed && reviews.some(r => r.department === 'iPreneur') && reviews.some(r => r.department === 'Investments') ? (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col gap-3 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 px-2 text-[10px] font-bold tracking-wider uppercase text-indigo-500 whitespace-nowrap">
                        Final Internal Decision
                    </div>
                    <button
                        onClick={() => handleFinalDecisionSubmit('accept')}
                        disabled={isSaving !== null}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        <CheckCircle className="w-4 h-4" /> Accept Application
                    </button>
                    <button
                        onClick={() => handleFinalDecisionSubmit('reject')}
                        disabled={isSaving !== null}
                        className="w-full py-3 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                    >
                        <XCircle className="w-4 h-4" /> Reject Application
                    </button>
                    <button
                        onClick={() => handleFinalDecisionSubmit('admin_review')}
                        disabled={isSaving !== null}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                        <Users className="w-4 h-4" /> Review with Admin
                    </button>
                </div>
            ) : null}
            </div>
        </aside>
    );

    const MainDashboardPanel = (
        <div className={`${(userProfile?.role === 'JURY' || searchParams.get('from') === 'jury_review' || activeTab === 'financials' || isPaymentContext || (isInternalReviewPage && activeTab === 'jury_eval')) ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 p-8 flex flex-col relative min-h-[500px] rounded-[24px] shadow-2xl shadow-indigo-500/5 transition-all duration-500`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-gray-200/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                            {submission?.is_onboarded ? 'Cohort Onboarding Portal' : userProfile?.role === 'JURY' ? 'Jury Scorecard' : (activeTab === 'financials' && isPaymentContext) ? 'Financial Verification' : activeTab === 'financials' ? 'Financials Page' : 'Startup Insights'}
                        </h1>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-widest uppercase mt-0.5">{submission?.company_name}</p>
                    </div>
                </div>

                {submission?.analysis_status === 'COMPLETED' && (
                    <div className="flex items-center gap-4">
                        {(!submission?.is_onboarded || isAIAnalysisPage || isInternalReviewPage ) && !isJuryReviewPage && !isPaymentContext && userProfile?.role?.toUpperCase() !== 'JURY' && (
                            <div className="flex bg-gray-100 dark:bg-slate-800/50 backdrop-blur-md p-1 rounded-xl shadow-inner border border-gray-200/50 dark:border-white/5">
                                {(userProfile?.role?.toUpperCase() === 'ADMIN' || userProfile?.role?.toUpperCase() === 'INTERNAL_TEAM') && (
                                    <>
                                        <button
                                            onClick={() => setActiveTab('custom')}
                                            className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'custom' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                        >
                                            Analysis
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('readiness')}
                                            className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'readiness' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                        >
                                            Readiness
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setActiveTab('onepager')}
                                    className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'onepager' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                >
                                    One Pager
                                </button>
                                {(userProfile?.role?.toUpperCase() === 'ADMIN' || userProfile?.role?.toUpperCase() === 'INTERNAL_TEAM' ) && !isAIAnalysisPage && (
                                    <button
                                        onClick={() => setActiveTab('jury_eval')}
                                        className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'jury_eval' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                    >
                                        Jury Evaluation
                                    </button>
                                )}
                                {(userProfile?.role?.toUpperCase() === 'ADMIN' || (userProfile?.role?.toUpperCase() === 'INTERNAL_TEAM' && userProfile?.department?.toUpperCase() !== 'DIGITAL')) && !isAIAnalysisPage && (
                                    <button
                                        onClick={() => setActiveTab('financials')}
                                        className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'financials' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                    >
                                        Financials Page
                                    </button>
                                )}
                                {userProfile?.role?.toUpperCase() !== 'JURY' && (
                                    <button
                                    onClick={() => setActiveTab('raw')}
                                    className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'raw' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                >
                                    Raw Data
                                </button>
                            )}
                            </div>
                        )}

                        {submission?.is_onboarded && (
                            <div className="flex bg-emerald-100 dark:bg-emerald-500/10 backdrop-blur-md p-1 rounded-xl shadow-inner border border-emerald-200/50 dark:border-emerald-500/20">
                                <button
                                    onClick={() => setActiveTab('financials')}
                                    className="px-6 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transition-all"
                                >
                                    MOU & Onboarding
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab !== 'financials' && !isPaymentContext && (
                    <div className="flex items-center gap-3">
                        <button
                        disabled={isGeneratingPdf}
                        onClick={async () => {
                            setIsGeneratingPdf(true);
                            const disabledSheets: any[] = [];
                            try {
                                const styleSheets = Array.from(document.styleSheets);
                                for (let i = 0; i < styleSheets.length; i++) {
                                    try {
                                        const rules = styleSheets[i].cssRules;
                                    } catch (e) {
                                        const sheet = styleSheets[i].ownerNode as HTMLElement;
                                        if (sheet) {
                                            (styleSheets[i] as any).disabled = true;
                                            disabledSheets.push(styleSheets[i]);
                                        }
                                    }
                                }

                                try {
                                    const reportElement = document.getElementById('report-content');
                                    if (!reportElement) throw new Error("Report content not found");
                                    const contentHtml = reportElement.innerHTML;
                                    const iframe = document.createElement('iframe');
                                    iframe.style.position = 'fixed';
                                    iframe.style.left = '-9999px';
                                    iframe.style.width = '1100px';
                                    iframe.style.height = 'auto';
                                    document.body.appendChild(iframe);
                                    const iframeDoc = iframe.contentWindow?.document;
                                    if (!iframeDoc) throw new Error("Could not initialize export context");
                                    
                                    // Use a stable, safe version of Tailwind that avoids modern color functions
                                    iframeDoc.write(`
                                        <!DOCTYPE html>
                                        <html>
                                            <head>
                                                <script src="https://cdn.tailwindcss.com/3.4.1"></script>
                                                <style>
                                                    body { font-family: sans-serif; -webkit-print-color-adjust: exact; }
                                                    .prose { max-width: none; color: #374151; }
                                                    .prose h1 { font-weight: 900; text-transform: uppercase; margin-bottom: 0.5rem; }
                                                    .prose p { margin-bottom: 1rem; line-height: 1.6; }
                                                </style>
                                            </head>
                                            <body class="bg-white px-4 py-12">
                                                <div class="max-w-5xl mx-auto">
                                                    <div class="flex items-center justify-between mb-12 pb-8 border-b border-gray-100">
                                                        <div>
                                                            <h1 class="text-4xl font-black text-gray-900 mb-2 uppercase">${submission.company_name}</h1>
                                                            <p class="text-sm font-bold text-indigo-600 tracking-widest uppercase">${activeTab} REPORT • ${new Date().toLocaleDateString()}</p>
                                                        </div>
                                                        <div class="text-right">
                                                            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Cohort 2024</p>
                                                            <p class="text-[10px] text-gray-500 font-medium mt-1">Confidential Internal Analysis</p>
                                                        </div>
                                                    </div>
                                                    <div class="prose max-w-none">
                                                        ${contentHtml}
                                                    </div>
                                                    <div class="mt-20 pt-8 border-t border-gray-100 flex justify-between items-center opacity-50">
                                                        <p class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Generated by Antigravity AI Engine</p>
                                                        <p class="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Page 1 of 1</p>
                                                    </div>
                                                </div>
                                            </body>
                                        </html>
                                    `);
                                    iframeDoc.close();

                                    await new Promise(r => setTimeout(r, 1500));
                                    const canvas = await html2canvas(iframeDoc.body, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 1100 });
                                    const dataUrl = canvas.toDataURL('image/png');
                                    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
                                    const imgProps = pdf.getImageProperties(dataUrl);
                                    const marginX = 2; // Reduced left/right margin
                                    const marginY = 10; // Top/bottom margin
                                    const pageHeight = pdf.internal.pageSize.getHeight();
                                    const contentWidth = pdf.internal.pageSize.getWidth() - marginX * 2;
                                    const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
                                    let heightLeft = imgHeight;
                                    let position = marginY;
                                    pdf.addImage(dataUrl, 'PNG', marginX, position, contentWidth, imgHeight, undefined, 'FAST');
                                    heightLeft -= (pageHeight - marginY * 2);
                                    while (heightLeft > 0) {
                                        pdf.addPage();
                                        position = marginY - (imgHeight - heightLeft);
                                        pdf.addImage(dataUrl, 'PNG', marginX, position, contentWidth, imgHeight, undefined, 'FAST');
                                        heightLeft -= (pageHeight - marginY * 2);
                                    }
                                    pdf.save(`${submission.company_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${activeTab}_report.pdf`);
                                    document.body.removeChild(iframe);
                                } catch (error: any) {
                                    console.error("Export inner error:", error);
                                    throw error;
                                } finally {
                                    disabledSheets.forEach(sheet => { sheet.disabled = false; });
                                }
                            } catch (error: any) {
                                console.error("PDF Final Error:", error);
                                alert(`Unable to generate PDF: ${error?.message || 'Please check your connection and try again.'}`);
                            } finally {
                                setIsGeneratingPdf(false);
                            }
                        }}

                        className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-black dark:text-gray-400 hover:text-black dark:text-white dark:bg-white/5 dark:border-transparent dark:hover:bg-white/10 dark:text-gray-300 dark:hover:text-white rounded-md transition-colors disabled:opacity-50"
                        title="Download this report"
                    >
                        {isGeneratingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                </div>
            )}

                <span className={`text-xs px-3 py-1 rounded-full font-medium sm:ml-auto ${submission?.is_onboarded ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : submission.analysis_status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                    submission.analysis_status === 'PROCESSING' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                        'bg-amber-500/20 text-amber-400'
                    }`}>
                    {submission?.is_onboarded ? 'ONBOARDED' : submission.analysis_status}
                </span>
            </div>
            
            <div className="flex flex-col gap-10 mt-2">
                {activeTab === 'financials' ? (
                    <div className="space-y-12">
                        {((submission.form_data?.__mou_status === 'PENDING_REVIEW') || (userProfile?.role?.toUpperCase() === 'ADMIN' || userProfile?.role?.toUpperCase() === 'INTERNAL_TEAM')) && (
                            <section className="border-2 border-amber-500 rounded-2xl p-6 bg-amber-50/30 dark:bg-amber-500/5">
                                <div className="p-2 text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-4">MOU Review Required</div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-amber-500" />
                                            </div>
                                            <h2 className="text-md font-bold text-black dark:text-white uppercase tracking-tight">MOU Preparation & Review</h2>
                                        </div>

                                        <div className="flex bg-indigo-50 dark:bg-indigo-500/10 p-1 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                                            <button 
                                                onClick={() => setMouMode('FIELDS')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mouMode === 'FIELDS' ? 'bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white shadow-md' : 'text-gray-400 hover:text-indigo-500'}`}
                                            >
                                                Fields View
                                            </button>
                                            <button 
                                                onClick={() => setMouMode('EDITOR')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mouMode === 'EDITOR' ? 'bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white shadow-md' : 'text-gray-400 hover:text-indigo-500'}`}
                                            >
                                                Live Editor
                                            </button>
                                        </div>
                                    </div>

                                    {/* Template Management (Admin Only) */}
                                    <div className="flex items-center gap-2">
                                        {mouMode === 'EDITOR' && (
                                            <button 
                                                onClick={handleSaveTemplateText}
                                                disabled={isSavingTemplate}
                                                className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all"
                                            >
                                                {isSavingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            </button>
                                        )}
                                        <button 
                                            onClick={handleDownloadMasterTemplate}
                                            title="Download current master template"
                                            className="p-2 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-indigo-600 rounded-lg transition-all"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </button>
                                        <input 
                                            type="file" 
                                            accept=".docx"
                                            onChange={handleUpdateMasterTemplate}
                                            className="hidden" 
                                            id="master-template-upload"
                                        />
                                        <label 
                                            htmlFor="master-template-upload"
                                            title="Update master template (.docx)"
                                            className="p-2 bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-emerald-600 rounded-lg cursor-pointer transition-all"
                                        >
                                            {isUpdatingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                        </label>
                                    </div>
                                </div>
                                {mouMode === 'FIELDS' ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Startup Name</label>
                                                        <input 
                                                            type="text" 
                                                            defaultValue={mouDraft?.company_name || submission.form_data?.__mou_draft?.company_name}
                                                            onChange={(e) => setMouDraft({...mouDraft, company_name: e.target.value})}
                                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Founder Name</label>
                                                        <input 
                                                            type="text" 
                                                            defaultValue={mouDraft?.founder || submission.form_data?.__mou_draft?.founder}
                                                            onChange={(e) => setMouDraft({...mouDraft, founder: e.target.value})}
                                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MOU Date</label>
                                                        <input 
                                                            type="text" 
                                                            defaultValue={mouDraft?.date || submission.form_data?.__mou_draft?.date}
                                                            onChange={(e) => setMouDraft({...mouDraft, date: e.target.value})}
                                                            placeholder="DD/MM/YYYY"
                                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                        />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company Address</label>
                                                        <textarea 
                                                            defaultValue={mouDraft?.address || submission.form_data?.__mou_draft?.address}
                                                            onChange={(e) => setMouDraft({...mouDraft, address: e.target.value})}
                                                            rows={6}
                                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                                    <p className="text-[11px] text-gray-500 italic max-w-xs">Review details on the right. Clicking "Send MOU" will generate and email it.</p>
                                                    <button 
                                                        onClick={handleSendMOU}
                                                        disabled={isSendingMOU}
                                                        className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2"
                                                    >
                                                        {isSendingMOU ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                                        Send MOU
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/10 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck className="w-3 h-3 text-indigo-500" />
                                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Data Discovery Debug</span>
                                                </div>
                                                <div className="text-[9px] text-gray-500 dark:text-gray-400 font-mono grid grid-cols-1 gap-1">
                                                    <div><span className="text-indigo-500 font-bold">Raw Startup Name:</span> {submission.company_name || 'NULL'}</div>
                                                    <div><span className="text-indigo-500 font-bold">Search 'Startup Name':</span> {Object.keys(submission.form_data || {}).find(k => k.toLowerCase().includes('startup name')) || 'NOT FOUND'}</div>
                                                    <div className="mt-1 pt-1 border-t border-indigo-100 dark:border-indigo-500/10 overflow-x-auto max-h-32 overflow-y-auto">
                                                        <span className="text-indigo-500 font-bold">All Keys ({Object.keys(submission.form_data || {}).length}):</span> 
                                                        <ul className="list-disc ml-4 mt-1">
                                                            {Object.keys(submission.form_data || {}).map(k => <li key={k}>{k}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* Live Preview Pane */}
                                            <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-8 border border-gray-100 dark:border-white/5 max-h-[800px] overflow-y-auto">
                                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-white/5">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Preview</span>
                                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase">Live Sync</span>
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-300 font-serif leading-relaxed whitespace-pre-wrap space-y-4">
                                                    {getProcessedContent()}
                                                </div>

                                            </div>
                                        </div>
                                ) : (
                                    <div className="bg-white dark:bg-white/5 border border-amber-500/20 rounded-2xl p-8 space-y-6 shadow-sm">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {['company_name', 'founder', 'address', 'date'].map(v => (
                                                <button key={v} onClick={() => insertVariable(v)} className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-[10px] font-bold rounded-lg hover:bg-amber-500/10 hover:text-amber-600 transition-all">
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                        <div className={`transition-all duration-500 ${isMaximized ? 'fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-xl p-8 overflow-y-auto' : 'w-full'}`}>
                                            {isMaximized && (
                                                <button 
                                                    onClick={() => setIsMaximized(false)}
                                                    className="fixed top-8 right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-[110]"
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            )}
                                            
                                            <div className={`bg-white dark:bg-white shadow-2xl mx-auto transition-all duration-500 ${isMaximized ? 'max-w-4xl min-h-[1600px] p-20' : 'w-full min-h-[1200px] p-16'} rounded-sm border border-gray-200 relative`}>
                                                <div className="absolute top-4 right-4 flex items-center gap-2 no-print">
                                                    <button 
                                                        onClick={() => setIsMaximized(!isMaximized)}
                                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-all"
                                                        title={isMaximized ? "Exit Fullscreen" : "Fullscreen Focus"}
                                                    >
                                                        {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                                    </button>
                                                </div>

                                                <textarea 
                                                    ref={textareaRef}
                                                    value={editorContent}
                                                    onChange={(e) => setEditorContent(e.target.value)}
                                                    className="w-full h-full min-h-[1000px] bg-transparent border-none focus:ring-0 text-gray-900 font-serif text-lg leading-loose resize-none"
                                                    placeholder="Start typing your MOU here..."
                                                />
                                            </div>

                                            {!isMaximized && (
                                                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={handleSaveTemplateText}
                                                            disabled={isSavingTemplate}
                                                            className="px-6 py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-sm hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                                                        >
                                                            {isSavingTemplate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                            Save Template
                                                        </button>
                                                        <p className="text-[11px] text-gray-500 italic">Save as the master template for all future MOUs.</p>
                                                    </div>
                                                    <button 
                                                        onClick={handleSendMOUText}
                                                        disabled={isSendingMOU}
                                                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2"
                                                    >
                                                        {isSendingMOU ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                        Finalize & Send MOU
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                        {activeTab === 'financials' && !isPaymentContext && (loadingFinancials || financialDocs.length > 0) && (
                            <section className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <h2 className="text-md font-bold text-black dark:text-white uppercase tracking-tight">Verified Financial Documents</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {loadingFinancials ? (
                                        [1, 2].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-white/5 animate-pulse rounded-xl" />)
                                    ) : (
                                        financialDocs.map((doc, idx) => (
                                            <a key={idx} href={doc.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl hover:scale-[1.02] transition-all group">
                                                <div className="w-10 h-10 rounded-lg bg-white dark:bg-white/5 flex items-center justify-center shadow-sm group-hover:bg-emerald-500/10 transition-colors">
                                                    <FileText className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate uppercase">{doc.file_name}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">Verified Asset • {new Date(doc.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <Download className="w-4 h-4 text-gray-300 group-hover:text-emerald-500" />
                                            </a>
                                        ))
                                    )}
                                </div>
                            </section>
                        )}
                        {activeTab === 'financials' && (
                            <section className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <CreditCard className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <h2 className="text-md font-bold text-black dark:text-white uppercase tracking-tight">Fee Verification & Financials Tracking</h2>
                                </div>
                                <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cohort Onboarding Fee</p>
                                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">₹ 2,500.00</p>
                                        </div>
                                        <div className={`px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase ${submission.payment_status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                            {submission.payment_status || 'PENDING'}
                                        </div>
                                    </div>
                                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Reference</p><p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">{submission.razorpay_order_id || 'N/A'}</p></div>
                                        <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Method</p><p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">Razorpay Secured</p></div>
                                        <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tax ID</p><p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">GST Included</p></div>
                                        <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Account Status</p><p className="text-xs font-bold text-emerald-500 mt-1">Good Standing</p></div>
                                    </div>
                                </div>
                            </section>
                        )}


                    </div>
                ) : (
                    <div id="report-content" className="flex-1">
                        {submission.analysis_status === 'COMPLETED' ? (
                            <>
                                {activeTab === 'onepager' ? (
                                    renderAnalysisContent(submission.one_pager_analysis, "*No one-pager analysis generated.*")
                                ) : activeTab === 'readiness' ? (
                                    renderAnalysisContent(submission.readiness_analysis, "*No readiness analysis generated.*")
                                ) : activeTab === 'jury_eval' ? (
                                    userProfile?.role?.toUpperCase() === 'JURY' ? (
                                        renderAnalysisContent(submission.one_pager_analysis, "*No one-pager analysis generated.*")
                                    ) : (
                                        <div className="space-y-12">
                                            {evaluations.length > 0 ? (
                                                <>
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 text-center">
                                                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Total Score</div>
                                                            <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{Math.round(evaluations.reduce((sum, e) => sum + e.total_score, 0) / evaluations.length)}/65</div>
                                                            <div className="text-[10px] text-gray-400 mt-2 font-medium">Avg. across {evaluations.length} jury members</div>
                                                        </div>
                                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center">
                                                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Reviews Complete</div>
                                                            <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{evaluations.length}/{assignedJuryIds.length}</div>
                                                            <div className="text-[10px] text-gray-400 mt-2 font-medium">Assigned Jury Members</div>
                                                        </div>
                                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center md:col-span-2 flex flex-col justify-center">
                                                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Performance Index</div>
                                                            <div className="h-2 w-full bg-emerald-500/10 rounded-full mt-4 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(evaluations.reduce((sum, e) => sum + e.total_score, 0) / evaluations.length) * (100/65)}%` }} /></div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-8">
                                                        <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-widest border-l-4 border-indigo-600 pl-4">Expert Remarks</h3>
                                                        <div className="grid grid-cols-1 gap-6">
                                                            {evaluations.map((evalItem) => (
                                                                <div key={evalItem.id} className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[24px] p-8 shadow-sm relative overflow-hidden group">
                                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Gavel className="w-20 h-20" /></div>
                                                                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-white/5 relative z-10">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm">{evalItem.users?.name?.charAt(0) || 'J'}</div>
                                                                            <div><p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{evalItem.users?.name || 'Jury Member'}</p><p className="text-[10px] text-gray-400 font-bold tracking-widest">{evalItem.users?.email}</p></div>
                                                                        </div>
                                                                        <div className="text-right flex flex-col items-end"><p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Total Score Card</p><span className="text-3xl font-black text-gray-900 dark:text-white">{evalItem.total_score}/65</span></div>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 relative z-10">
                                                                        {EVALUATION_CRITERIA.map(c => (
                                                                            <div key={c.id} className="space-y-3">
                                                                                <div className="flex items-center justify-between"><span className="text-[10px] font-black text-gray-500 dark:text-indigo-400/70 uppercase tracking-widest">{c.label}</span><span className="text-xs font-black text-gray-900 dark:text-white px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">{evalItem.scores?.[c.id] || 0}/5</span></div>
                                                                                {evalItem.notes?.[c.id] && <div className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-[11px] text-gray-600 dark:text-gray-400 italic leading-relaxed shadow-inner">"${evalItem.notes[c.id]}"</div>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/5 relative z-10">
                                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-6">Additional Inquiries</p>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                            {ADDITIONAL_QUESTIONS.map(q => (
                                                                                <div key={q.id} className="space-y-3">
                                                                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-gray-500 dark:text-emerald-400/70 uppercase tracking-widest">{q.label}</span>{evalItem.scores?.[q.id] && <span className="text-xs font-black text-gray-900 dark:text-white px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">{evalItem.scores[q.id]}/5</span>}</div>
                                                                                    {evalItem.notes?.[q.id] && <div className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-[11px] text-gray-600 dark:text-gray-400 italic leading-relaxed shadow-inner">"${evalItem.notes[q.id]}"</div>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {(userProfile?.role?.toUpperCase() === 'ADMIN' || userProfile?.role?.toUpperCase() === 'INTERNAL_TEAM') && (
                                                        <div className="mt-12">
                                                            {(isJuryReviewPage || activeTab === 'jury_eval') ? (
                                                                /* JURY STAGE DECISION */
                                                                (!submission.admin_jury_decision && !submission.is_rejected) ? (


                                                                    <div className="p-8 bg-indigo-600 rounded-[24px] text-white shadow-xl shadow-indigo-600/20 animate-fade-up">
                                                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                                                                    <ShieldCheck className="w-6 h-6 text-white" />
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-lg font-black uppercase tracking-widest mb-1">Final Jury Decision</h3>
                                                                                    <p className="text-xs text-indigo-100 opacity-80 max-w-md">Jury evaluation is complete. As an administrator, you must now provide the final verdict.</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                                                <button 
                                                                                    onClick={() => handleAdminJuryDecision('Accept')}
                                                                                    disabled={isSaving !== null}
                                                                                    className="flex-1 md:flex-none px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                                                                                >
                                                                                    {isSaving === 'admin_jury_Accept' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept Startup
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => handleAdminJuryDecision('Reject')}
                                                                                    disabled={isSaving !== null}
                                                                                    className="flex-1 md:flex-none px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 border border-red-400/30"
                                                                                >
                                                                                    {isSaving === 'admin_jury_Reject' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject Startup
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className={`p-8 rounded-[24px] border-2 animate-fade-up ${
                                                                        submission.admin_jury_decision === 'REJECTED' || (submission.is_jury_reviewed && submission.is_jury_accepted === false) 
                                                                            ? 'bg-red-500/5 border-red-500/20 text-red-600' 
                                                                            : submission.admin_jury_decision === 'ACCEPTED'
                                                                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'
                                                                                : 'bg-blue-500/5 border-blue-500/20 text-blue-600'
                                                                    }`}>
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                                                    submission.admin_jury_decision === 'REJECTED' || (submission.is_jury_reviewed && submission.is_jury_accepted === false) 
                                                                                        ? 'bg-red-500 text-white' 
                                                                                        : submission.admin_jury_decision === 'ACCEPTED'
                                                                                            ? 'bg-emerald-500 text-white'
                                                                                            : 'bg-blue-500 text-white'
                                                                                }`}>
                                                                                    {submission.admin_jury_decision === 'REJECTED' || (submission.is_jury_reviewed && submission.is_jury_accepted === false) 
                                                                                        ? <XCircle className="w-6 h-6" /> 
                                                                                        : submission.admin_jury_decision === 'ACCEPTED'
                                                                                            ? <CheckCircle className="w-6 h-6" />
                                                                                            : <RefreshCw className="w-6 h-6 animate-pulse" />
                                                                                    }
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-xl font-black uppercase tracking-wider">
                                                                                        {submission.admin_jury_decision === 'REJECTED' || (submission.is_jury_reviewed && submission.is_jury_accepted === false) 
                                                                                            ? 'Startup Rejected' 
                                                                                            : submission.admin_jury_decision === 'ACCEPTED'
                                                                                                ? 'Startup Accepted' 
                                                                                                : 'Jury Review in Progress'}
                                                                                    </h3>
                                                                                    <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">
                                                                                        {submission.admin_jury_decision !== null || (submission.is_jury_reviewed && submission.is_jury_accepted !== null) 
                                                                                            ? 'Final verdict recorded by Admin' 
                                                                                            : 'Waiting for all Jury evaluations to complete'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            {submission.admin_jury_decision === 'ACCEPTED' && (
                                                                                <div className="hidden md:block px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Financials Verification Triggered ✓</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                /* INTERNAL STAGE DECISION */
                                                                /* INTERNAL STAGE DECISION */
                                                                !submission.is_internal_reviewed ? (
                                                                    <div className="p-8 bg-indigo-600 rounded-[24px] text-white shadow-xl shadow-indigo-600/20 animate-fade-up">
                                                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                                                                    <ShieldCheck className="w-6 h-6 text-white" />
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-lg font-black uppercase tracking-widest mb-1">Final Internal Decision</h3>
                                                                                    <p className="text-xs text-indigo-100 opacity-80 max-w-md">As an administrator, you can now finalize this application based on the evaluation.</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                                                <button 
                                                                                    onClick={() => handleAdminReviewSubmit('Accept')}
                                                                                    disabled={isSaving !== null}
                                                                                    className="flex-1 md:flex-none px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                                                                                >
                                                                                    {isSaving === 'Accept' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept Application
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => handleAdminReviewSubmit('Reject')}
                                                                                    disabled={isSaving !== null}
                                                                                    className="flex-1 md:flex-none px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 border border-red-400/30"
                                                                                >
                                                                                    {isSaving === 'Reject' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject Application
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className={`p-8 rounded-[24px] border-2 animate-fade-up ${submission.is_withdrawn || submission.form_data?.__is_withdrawn ? 'bg-gray-500/5 border-gray-500/20 text-gray-600' : submission.is_rejected ? 'bg-red-500/5 border-red-500/20 text-red-600' : 'bg-blue-500/5 border-blue-500/20 text-blue-600'}`}>
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${submission.is_withdrawn || submission.form_data?.__is_withdrawn ? 'bg-gray-500 text-white' : submission.is_rejected ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                                                    {submission.is_withdrawn || submission.form_data?.__is_withdrawn ? <AlertTriangle className="w-6 h-6" /> : submission.is_rejected ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-xl font-black uppercase tracking-wider">
                                                                                        {submission.is_withdrawn || submission.form_data?.__is_withdrawn ? 'Application Withdrawn' : submission.is_rejected ? 'Application Rejected' : 'Application Accepted & Passed to Jury'}
                                                                                    </h3>
                                                                                    <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">{submission.is_withdrawn || submission.form_data?.__is_withdrawn ? 'Startup has withdrawn their application' : 'Final decision recorded by Admin'}</p>
                                                                                </div>
                                                                            </div>
                                                                            {submission.admin_jury_decision === 'ACCEPTED' && (
                                                                                <div className="hidden md:block px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Financials Verification Triggered ✓</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                                    <Gavel className="w-16 h-16 text-gray-200 dark:text-gray-800 mb-4" />
                                                    <h3 className="text-lg font-bold text-gray-400">No Jury Evaluations Yet</h3>
                                                    <p className="text-sm text-gray-500 mt-2 max-w-xs">Once the jury submits their feedback, the complete scorecard will appear here.</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                ) : activeTab === 'raw' ? (
                                    <div className="space-y-6">
                                        {formFields.map(([q, a]: any, idx: number) => (
                                            <div key={idx} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{q}</p>
                                                <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{String(a)}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    renderAnalysisContent(submission.ai_analysis, "*No custom criteria analysis generated.*")
                                )}
                            </>
                        ) : submission.analysis_status === 'PROCESSING' ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-black dark:text-gray-300 py-12">
                                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                                <p>The AI is currently analyzing this startup...</p>
                                <p className="text-xs text-black dark:text-gray-400 mt-2 text-center max-w-xs">
                                    120-Billion Parameter models can take 30-60 seconds to complete a highly-detailed report. Check back soon.
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-black dark:text-gray-300 py-12">
                                <p>This startup is waiting in the queue.</p>
                                <button
                                    onClick={async () => {
                                        try { await fetch('/api/cron/process-queue'); fetchData(resolvedParams.id); }
                                        catch (e) { }
                                    }}
                                    className="mt-4 btn-primary text-xs px-4 py-2"
                                >
                                    Force Start AI Analysis
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
);

    return (
        <div className="min-h-screen p-6 md:p-12 relative flex flex-col bg-[#f8fafc] dark:bg-[#08080a] selection:bg-indigo-500/30">
            {/* Subtle mesh background effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 dark:opacity-20 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px]" />
            </div>

            {NavigationHeader}

            {/* Scheduled Session Banner (Zoom Integration) - Visible only in Jury Evaluation context and if NOT onboarded */}
            {!submission?.is_onboarded && !submission?.is_jury_reviewed && (activeTab === 'jury_eval' || searchParams.get('from') === 'jury_review') && (scheduledDate || scheduledTime) && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl animate-fade-up">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-black dark:text-white uppercase tracking-tight">Scheduled Jury Session</h2>
                                <p className="text-sm text-gray-500 font-medium">This startup is currently undergoing expert evaluation.</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                <Clock className="w-4 h-4 text-indigo-500" />
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {new Date(scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {scheduledTime}
                                </span>
                            </div>

                            {scheduledZoomLink && (
                                <a 
                                    href={scheduledZoomLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 px-6 py-2.5 bg-gray-100 dark:bg-white/10 text-black dark:text-gray-300 rounded-xl font-bold text-sm hover:scale-[1.02] transition-all"
                                >
                                    Open Zoom App
                                </a>
                            )}

                            {scheduledZoomLink ? (
                                (userProfile?.role === 'JURY' || userProfile?.role === 'ADMIN' || userProfile?.role === 'INTERNAL_TEAM') && (
                                    <button 
                                        onClick={() => {
                                            setIsLiveMode(true);
                                            setIsEvalFormOpen(true);
                                        }}
                                        className="flex items-center gap-3 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm transition-all hover:bg-indigo-700"
                                    >
                                        <Video className="w-4 h-4" /> Launch Live Evaluation
                                    </button>
                                )
                            ) : (
                                <div className="text-[10px] text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-500/20">
                                   ⚠️ Zoom link missing. Please re-assign jury to generate.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-up relative z-10" style={{ animationDelay: '0.1s' }}>

                {/* Main Panel: Analysis & Data (Hidden if in full-screen Internal Review mode, unless viewing Jury Eval) */}
                {(!isInternalReviewPage || activeTab === 'jury_eval') && MainDashboardPanel}

                {/* Internal Review Aside (Visible for Admins & Internal Team, hidden during Jury Eval) */}
                {InternalReviewAside}

                {/* Evaluation Form as Drawer (Jury Only) */}
                {userProfile?.role === 'JURY' && (
                    <div className="relative">
                        {/* Overlay to close when clicking outside (mobile/backdrop) */}
                        {isEvalFormOpen && (
                            <div className="fixed inset-0 bg-black/10 z-[55] transition-opacity duration-300" onClick={() => setIsEvalFormOpen(false)} />
                        )}
                        
                        <div className={`fixed inset-y-0 right-0 w-full sm:w-[480px] z-[60] transition-all duration-500 ease-in-out transform ${isEvalFormOpen ? 'translate-x-0 shadow-2xl visible' : 'translate-x-[110%] invisible pointer-events-none'}`}>
                            <div className="h-full bg-white dark:bg-[#0a0a0c] border-l border-gray-200 dark:border-white/10 flex flex-col relative z-10">
                                <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                                    <div className="flex items-center gap-2">
                                        <Gavel className="w-5 h-5 text-indigo-500" />
                                        <h2 className="text-lg font-bold text-black dark:text-white">Jury Evaluation</h2>
                                    </div>
                                    <button 
                                        onClick={() => setIsEvalFormOpen(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                    {EVALUATION_CRITERIA.map((criterion) => {
                                        const myEval = evaluations.find(e => e.jury_id === userProfile.id);
                                        const currentScore = myEval?.scores?.[criterion.id] || 0;
                                        const currentNote = myEval?.notes?.[criterion.id] || '';

                                        return (
                                            <div key={criterion.id} className="space-y-3">
                                                <div>
                                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">{criterion.label}</label>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">{criterion.description}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((score) => (
                                                        <button
                                                            key={score}
                                                            onClick={() => {
                                                                const newScores = { ...(myEval?.scores || {}), [criterion.id]: score };
                                                                const total = calculateTotalScore(newScores);
                                                                handleSaveEvaluation(newScores, myEval?.notes || {}, total);
                                                            }}
                                                            className={`w-9 h-9 rounded-lg border text-sm font-bold transition-all ${Number(currentScore) === score ? 'bg-indigo-950 border-indigo-950 text-white shadow-lg shadow-indigo-900/40' : 'border-gray-200 dark:border-white/10 text-gray-400 hover:border-indigo-500/50'}`}
                                                        >
                                                            {score}
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    placeholder="Questions & Notes..."
                                                    defaultValue={currentNote}
                                                    onBlur={(e) => {
                                                        const newNotes = { ...(myEval?.notes || {}), [criterion.id]: e.target.value };
                                                        handleSaveEvaluation(myEval?.scores || {}, newNotes, calculateTotalScore(myEval?.scores));
                                                    }}
                                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-510 transition-all min-h-[80px]"
                                                />
                                            </div>
                                        );
                                    })}

                                    <div className="pt-6 border-t border-gray-100 dark:border-white/5 space-y-6">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Additional Questions</h3>
                                        {ADDITIONAL_QUESTIONS.map((q) => {
                                            const myEval = evaluations.find(e => e.jury_id === userProfile.id);
                                            const currentScore = myEval?.scores?.[q.id] || 0;
                                            const currentNote = myEval?.notes?.[q.id] || '';
                                            const hasScore = !['investment_type', 'market_access'].includes(q.id);

                                            return (
                                                <div key={q.id} className="space-y-3">
                                                    <div>
                                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200">{q.label}</label>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">{q.description}</p>
                                                    </div>
                                                    {hasScore && (
                                                        <div className="flex gap-2">
                                                            {[1, 2, 3, 4, 5].map((score) => (
                                                                <button
                                                                    key={score}
                                                                    onClick={() => {
                                                                        const newScores = { ...(myEval?.scores || {}), [q.id]: score };
                                                                        handleSaveEvaluation(newScores, myEval?.notes || {}, calculateTotalScore(newScores));
                                                                    }}
                                                                    className={`w-9 h-9 rounded-lg border text-sm font-bold transition-all ${Number(currentScore) === score ? 'bg-indigo-950 border-indigo-950 text-white shadow-lg shadow-indigo-900/40' : 'border-gray-200 dark:border-white/10 text-gray-400 hover:border-indigo-500/50'}`}
                                                                >
                                                                    {score}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <textarea
                                                        placeholder="Questions & Notes..."
                                                        defaultValue={currentNote}
                                                        onBlur={(e) => {
                                                            const newNotes = { ...(myEval?.notes || {}), [q.id]: e.target.value };
                                                            handleSaveEvaluation(myEval?.scores || {}, newNotes, calculateTotalScore(myEval?.scores));
                                                        }}
                                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-510 transition-all min-h-[80px]"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                    <div className="p-6 bg-indigo-600 text-white shadow-inner">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Total Score</span>
                                            <span className="text-3xl font-black">{evaluations.find(e => e.jury_id === userProfile.id)?.total_score || 0}/65</span>
                                        </div>
                                        <p className="text-[10px] mt-2 opacity-70 italic">*Calculated from all 13 scored parameters</p>
                                    </div>

                                <div className="p-4 bg-white dark:bg-[#0a0a0c] border-t border-gray-200 dark:border-white/10">
                                    <button
                                        onClick={handleFinalEvaluationSubmit}
                                        disabled={isSubmittingEvaluation || (evaluations.some(e => e.jury_id === userProfile.id))}
                                        className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-xl shadow-indigo-600/10 active:scale-[0.98] ${evaluations.some(e => e.jury_id === userProfile.id) ? 'bg-emerald-500 text-white cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'}`}
                                    >
                                        {isSubmittingEvaluation ? (
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                        ) : evaluations.some(e => e.jury_id === userProfile.id) ? (
                                            <>
                                                <CheckCircle className="w-5 h-5" /> Your Evaluation Submitted
                                            </>
                                        ) : (
                                            <>
                                                <Gavel className="w-5 h-5" /> Submit Final Evaluation
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* JURY ASSIGNMENT MODAL */}
            {isJuryModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsJuryModalOpen(false)} />
                    
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] border border-white/20 dark:border-white/10 shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Jury Assignment</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Selection & Scheduling</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsJuryModalOpen(false);
                                    setIsJuryDropdownOpen(false);
                                    setJurySearchQuery('');
                                }} 
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>

                        </div>

                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Jury Member Selection */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Select Jury Members</label>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <div 
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
                                            onClick={() => setIsJuryDropdownOpen(!isJuryDropdownOpen)}
                                        >
                                            <input 
                                                type="text"
                                                placeholder="Search or select jury members..."
                                                className="bg-transparent border-none outline-none w-full text-sm dark:text-white placeholder:text-gray-400"
                                                value={jurySearchQuery}
                                                onChange={(e) => {
                                                    setJurySearchQuery(e.target.value);
                                                    if (!isJuryDropdownOpen) setIsJuryDropdownOpen(true);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isJuryDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {isJuryDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl z-[110] max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="p-2 space-y-1">
                                                    {juryMembers
                                                        .filter(member => 
                                                            !assignedJuryIds.includes(member.id) &&
                                                            (member.name.toLowerCase().includes(jurySearchQuery.toLowerCase()) || 
                                                             member.email?.toLowerCase().includes(jurySearchQuery.toLowerCase()))
                                                        )
                                                        .map((member) => (
                                                            <button
                                                                key={member.id}
                                                                onClick={() => {
                                                                    setAssignedJuryIds(prev => [...prev, member.id]);
                                                                    setIsJuryDropdownOpen(false);
                                                                    setJurySearchQuery('');
                                                                }}
                                                                className="w-full flex flex-col items-start px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-xl transition-all text-left group"
                                                            >
                                                                <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{member.name}</span>
                                                                <span className="text-[9px] text-gray-400 font-medium uppercase tracking-widest">{member.email || 'Jury Member'}</span>
                                                            </button>
                                                        ))
                                                    }
                                                    {juryMembers.filter(member => 
                                                        !assignedJuryIds.includes(member.id) &&
                                                        (member.name.toLowerCase().includes(jurySearchQuery.toLowerCase()) || 
                                                         member.email?.toLowerCase().includes(jurySearchQuery.toLowerCase()))
                                                    ).length === 0 && (
                                                        <div className="py-8 text-center opacity-40">
                                                            <Users className="w-8 h-8 mx-auto mb-2" />
                                                            <p className="text-[10px] font-bold uppercase tracking-widest">No members found</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>


                                    {/* Selected Chips */}
                                    {assignedJuryIds.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {assignedJuryIds.map(id => {
                                                const member = juryMembers.find(m => m.id === id);
                                                return (
                                                    <div key={id} className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-xl group animate-in fade-in zoom-in duration-200">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight leading-none">{member?.name || 'Unknown'}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => setAssignedJuryIds(prev => prev.filter(mid => mid !== id))}
                                                            className="w-5 h-5 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white text-indigo-400 transition-all"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Scheduling Section */}
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Presentation Schedule</label>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" /> Date
                                        </label>
                                        <input 
                                            type="date" 
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5" /> Time
                                        </label>
                                        <input 
                                            type="time" 
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-50 dark:bg-indigo-500/5 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/10 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                                    Saving these assignments will automatically notify all selected jury members via email with the presentation link and schedule.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5">
                            <button
                                onClick={handleJuryAssignmentSubmit}
                                disabled={isSavingAssignments || assignedJuryIds.length === 0}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                            >
                                {isSavingAssignments ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Finalize & Notify Jury
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PITCH DECK PREVIEW MODAL */}
            {showPitchDeck && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowPitchDeck(false)} />
                    
                    <div className="bg-white dark:bg-slate-900 w-full h-full max-w-7xl rounded-[32px] border border-white/20 dark:border-white/10 shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                    <Layout className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Pitch Deck Inspection</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{submission?.company_name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const formData = submission?.form_data || {};
                                    const deckKey = Object.keys(formData).find(k => 
                                        ['pitch deck', 'presentation', 'deck', 'pitch-deck', 'pitchdeck'].some(kw => k.toLowerCase().trim().replace(/[^a-z0-9]/g, '').includes(kw.toLowerCase().trim().replace(/[^a-z0-9]/g, '')))
                                    );
                                    const deckUrl = submission?.file_url || (deckKey ? String(formData[deckKey]) : null);
                                    return deckUrl ? (
                                        <button 
                                            onClick={() => window.open(deckUrl, '_blank')}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-indigo-600 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest"
                                        >
                                            <ExternalLink className="w-4 h-4" /> Open Original
                                        </button>
                                    ) : null;
                                })()}
                                <button onClick={() => setShowPitchDeck(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-gray-100 dark:bg-black/40 relative">
                            {(() => {
                                const formData = submission?.form_data || {};
                                const deckKey = Object.keys(formData).find(k => 
                                    ['pitch deck', 'presentation', 'deck', 'pitch-deck', 'pitchdeck'].some(kw => k.toLowerCase().trim().replace(/[^a-z0-9]/g, '').includes(kw.toLowerCase().trim().replace(/[^a-z0-9]/g, '')))
                                );
                                const deckUrl = submission?.file_url || (deckKey ? String(formData[deckKey]) : null);
                                
                                if (!deckUrl) return <div className="flex items-center justify-center h-full text-gray-500 font-bold uppercase tracking-widest">No deck URL found.</div>;

                                let previewUrl = deckUrl;
                                if (deckUrl.includes('drive.google.com')) {
                                    previewUrl = deckUrl.replace(/\/view\?usp=sharing|\/view|\/edit\?usp=sharing/g, '/preview');
                                } else if (!deckUrl.toLowerCase().endsWith('.pdf') && !deckUrl.includes('google.com')) {
                                    previewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(deckUrl)}&embedded=true`;
                                }

                                return (
                                    <iframe 
                                        src={previewUrl}
                                        className="w-full h-full border-none"
                                        title="Pitch Deck Preview"
                                        allow="autoplay"
                                    />
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}
