import type { IndentSheet, MasterSheet, ReceivedSheet, Sheet, StoreInSheet } from '@/types';
import type { InventorySheet, IssueSheet, PoMasterSheet, TallyEntrySheet, UserPermissions, Vendor, PcReportSheet } from '@/types/sheets';

export async function uploadFile({
    file,
    folderId,
    uploadType = 'upload',
    email,
    emailSubject,
    emailBody
}: {
    file: File;
    folderId: string;
    uploadType?: 'upload' | 'email';
    email?: string;
    emailSubject?: string;
    emailBody?: string;
}): Promise<string> {
    const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = (reader.result as string)?.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const form = new FormData();
    form.append('action', 'upload');
    form.append('fileName', file.name);
    form.append('mimeType', file.type);
    form.append('fileData', base64);
    form.append('folderId', folderId);
    form.append('uploadType', uploadType);
    
    // Only add email fields if uploadType is 'email' AND email exists
    if (uploadType === "email" && email) {
        form.append('email', email);
        form.append('emailSubject', emailSubject || 'Purchase Order');
        form.append('emailBody', emailBody || 'Please find attached PO.');
    }

    const response = await fetch(import.meta.env.VITE_APP_SCRIPT_URL, {
        method: 'POST',
        body: form,
        redirect: 'follow',
    });

    console.log(response)
    if (!response.ok) throw new Error('Failed to upload file');
    const res = await response.json();
    console.log(res)
    if (!res.success) throw new Error('Failed to upload data');

    return res.fileUrl as string;
}
export async function fetchSheet(
    sheetName: Sheet
): Promise<MasterSheet | IndentSheet[] | ReceivedSheet[] | UserPermissions[] | PoMasterSheet[] | InventorySheet[] | StoreInSheet[] | IssueSheet[] | TallyEntrySheet[] | PcReportSheet[]> {
    const url = `${import.meta.env.VITE_APP_SCRIPT_URL}?sheetName=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);


    // console.log(sheetName,response);

    if (!response.ok) throw new Error('Failed to fetch data');
    const raw = await response.json();
    if (!raw.success) throw new Error('Something went wrong when parsing data');

    // if (sheetName === 'MASTER') {
    //         const data = raw.options;

    //         // @ts-expect-error Assuming data is structured correctly
    //         const length = Math.max(...Object.values(data).map((arr) => arr.length));

    //         const vendors: Vendor[] = [];
    //         const groupHeads: Record<string, Set<string>> = {};
    //         const departments = new Set<string>();
    //         const paymentTerms = new Set<string>();
    //         const defaultTerms = new Set<string>();
    //         const uoms = new Set<string>();
    //         const firms = new Set<string>();
    //         const fmsNames = new Set<string>();

    //         for (let i = 0; i < length; i++) {
    //             const vendorName = data.vendorName?.[i];
    //             const gstin = data.vendorGstin?.[i];
    //             const address = data.vendorAddress?.[i];
    //             const email = data.vendorEmail?.[i];
    //             if (vendorName && gstin && address) {
    //                 vendors.push({ vendorName, gstin, address, email });
    //             }

    //             if (data.department?.[i]) departments.add(data.department[i]);
    //             if (data.paymentTerm?.[i]) paymentTerms.add(data.paymentTerm[i]);
    //             if (data.defaultTerms?.[i]) defaultTerms.add(data.defaultTerms[i])
    //             if (data.uom?.[i]) uoms.add(data.uom[i]);
    //             if (data.firmName?.[i]) firms.add(data.firmName[i]);
    //             if (data.fmsName?.[i]) fmsNames.add(data.fmsName[i]);


    //             const group = data.groupHead?.[i];
    //             const item = data.itemName?.[i];
    //             if (group && item) {
    //                 if (!groupHeads[group]) groupHeads[group] = new Set();
    //                 groupHeads[group].add(item);
    //             }
    //         }


    //         // console.log("vendore",vendors);

    //         return {
    //             vendors,
    //             departments: [...departments],
    //             paymentTerms: [...paymentTerms],
    //             groupHeads: Object.fromEntries(Object.entries(groupHeads).map(([k, v]) => [k, [...v]])),
    //             companyPan: data.companyPan,
    //             companyName: data.companyName,
    //             companyAddress: data.companyAddress,
    //             companyPhone: data.companyPhone,
    //             companyGstin: data.companyGstin,
    //             billingAddress: data.billingAddress,
    //             destinationAddress: data.destinationAddress,
    //             defaultTerms: [...defaultTerms],
    //             uoms: [...uoms],
    //             firms: [...firms],
    //             fmsNames: [...fmsNames],
    //         };
    //     }


   if (sheetName === 'MASTER') {
    const data = raw.options;
    
    console.log("🔍 Raw Master Sheet Data:", data);
    console.log("🔍 vendorName column data:", data.vendorName);
    
    const length = Math.max(...Object.values(data).map((arr) => (arr as unknown[]).length));
    console.log("📏 Total rows:", length);

    const vendors: Vendor[] = [];
    const groupHeads: Record<string, Set<string>> = {};
    const departments = new Set<string>();
    const paymentTerms = new Set<string>();
    const defaultTerms = new Set<string>();
    const uoms = new Set<string>();
    const firms = new Set<string>();
    const fmsNames = new Set<string>();
    const firmCompanyMap: Record<string, { companyName: string; companyAddress: string; destinationAddress: string }> = {};

    for (let i = 0; i < length; i++) {
        const vendorName = data.vendorName?.[i];
        const gstin = data.vendorGstin?.[i];
        const address = data.vendorAddress?.[i];
        const email = data.vendorEmail?.[i];
        
        // ✅ CHANGED: Sirf vendorName check karo
        if (vendorName) {
            vendors.push({ 
                vendorName, 
                gstin: gstin || '', 
                address: address || '', 
                email: email || '' 
            });
        }

        if (data.department?.[i]) departments.add(data.department[i]);
        if (data.paymentTerm?.[i]) paymentTerms.add(data.paymentTerm[i]);
        if (data.defaultTerms?.[i]) defaultTerms.add(data.defaultTerms[i])
        if (data.uom?.[i]) uoms.add(data.uom[i]);
        if (data.firmName?.[i]) firms.add(data.firmName[i]);
        if (data.fmsName?.[i]) fmsNames.add(data.fmsName[i]);

        const firmName = data.firmName?.[i];
        const companyName = data.companyName?.[i];
        const companyAddress = data.companyAddress?.[i];
        const destinationAddress = data.destinationAddress?.[i];
        if (firmName && companyName && companyAddress && destinationAddress) {
            firmCompanyMap[firmName] = { companyName, companyAddress, destinationAddress };
        }

        const group = data.groupHead?.[i];
        const item = data.itemName?.[i];
        if (group && item) {
            if (!groupHeads[group]) groupHeads[group] = new Set();
            groupHeads[group].add(item);
        }
    }

    console.log("📦 FINAL - Total vendors parsed:", vendors.length);

   return {
        vendors,
        vendorNames: vendors.map(v => v.vendorName),
        departments: [...departments],
        paymentTerms: [...paymentTerms],
        groupHeads: Object.fromEntries(Object.entries(groupHeads).map(([k, v]) => [k, [...v]])),
        companyPan: data.companyPan,
        companyName: data.companyName,
        companyAddress: data.companyAddress,
        companyPhone: data.companyPhone,
        companyGstin: data.companyGstin,
        billingAddress: data.billingAddress,
        destinationAddress: data.destinationAddress,
        defaultTerms: [...defaultTerms],
        uoms: [...uoms],
        firms: [...firms],
        fmsNames: [...fmsNames],
        firmCompanyMap,
        firmsnames: data.firmsnames ?? [],
    };
}
    return raw.rows.filter((r: IndentSheet) => r.timestamp !== '');
}

export async function postToSheet(
    data:
        | Partial<IndentSheet>[]
        | Partial<ReceivedSheet>[]
        | Partial<UserPermissions>[]
        | Partial<PoMasterSheet>[]
        | Partial<StoreInSheet>[]
        | Partial<TallyEntrySheet>[]
        | Partial<PcReportSheet>[],
    action: 'insert' | 'update' | 'delete' = 'insert',
    sheet: Sheet = 'INDENT'
) {
    try {
        const form = new FormData();
        form.append('action', action);
        form.append('sheetName', sheet);
        form.append('rows', JSON.stringify(data));

        console.log("form", form);

        const response = await fetch(import.meta.env.VITE_APP_SCRIPT_URL, {
            method: 'POST',
            body: form,
            redirect: 'follow', // ✅ Add this
            mode: 'cors',       // ✅ Add this
            credentials: 'omit' // ✅ Add this
        });

        // ✅ Handle response properly
        if (!response.ok) {
            console.error(`Error in fetch: ${response.status} - ${response.statusText}`);
            throw new Error(`Failed to ${action} data`);
        }

        // ✅ Parse response as text first, then JSON
        const textResponse = await response.text();
        const res = JSON.parse(textResponse);
        
        if (!res.success) {
            console.error(`Error in response: ${res.error || res.message}`);
            throw new Error(res.error || 'Something went wrong in the API');
        }

        return res; // ✅ Return the result
    } catch (error) {
        console.error('Error in postToSheet:', error);
        throw error;
    }
}

export const postToIssueSheet = async (
    data: Partial<IssueSheet>[],
    action: 'insert' | 'update' | 'delete' = 'insert'
) => {
    const form = new FormData();
    form.append('action', action);
    form.append('sheetName', 'ISSUE'); // Use 'ISSUE' as the sheet name
    form.append('rows', JSON.stringify(data));

    // Proper way to inspect FormData contents
    console.log("FormData contents:");
    for (const [key, value] of form.entries()) {
        console.log(key, value);
    }

    const response = await fetch(import.meta.env.VITE_APP_SCRIPT_URL, {
        method: 'POST',
        body: form,
    });

    if (!response.ok) {
        console.error(`Error in fetch: ${response.status} - ${response.statusText}`);
        throw new Error(`Failed to ${action} data`);
    }

    const res = await response.json();
    if (!res.success) {
        console.error(`Error in response: ${res.message}`);
        throw new Error('Something went wrong in the API');
    }

    return res;
};