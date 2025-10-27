import { ListTodo } from 'lucide-react';
import Heading from '../element/Heading';
import { useSheets } from '@/context/SheetsContext';
import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/lib/utils';
import DataTable from '../element/DataTable';
import { useAuth } from '@/context/AuthContext';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
    DialogHeader,
    DialogFooter,
    DialogClose,
} from '../ui/dialog';
import { postToSheet } from '@/lib/fetchers';
import { toast } from 'sonner';
import { PuffLoader as Loader } from 'react-spinners';

interface PendingIndentsData {
    date: string;
    indentNo: string;
    product: string;
    quantity: number;
    rate: number;
    uom: string;
    vendorName: string;
    paymentTerm: string;
    specifications: string;
    firmNameMatch: string;
}

export default () => {
    const { indentSheet, indentLoading, updateIndentSheet } = useSheets();
    const { user } = useAuth();

    const [tableData, setTableData] = useState<PendingIndentsData[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedIndent, setSelectedIndent] = useState<PendingIndentsData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(()=>{
        console.log(indentSheet);
    },[indentSheet])

    // Fetching table data
    useEffect(() => {
        // Pehle firm name se filter karo (case-insensitive)
        const filteredByFirm = indentSheet.filter(sheet => 
            user.firmNameMatch.toLowerCase() === "all" || sheet.firmName === user.firmNameMatch
        );
        
        setTableData(
            filteredByFirm
                .filter((sheet) => {
                    // Show only when:
                    // 1. status (column BG) is "Pending" 
                    // 2. AND approvedVendorName (column AW) is not null/empty
                    return sheet.status === "Pending" && 
                           sheet.approvedVendorName && 
                           sheet.approvedVendorName.trim() !== '';
                })
                .map((sheet) => ({
                    date: formatDate(new Date(sheet.timestamp)),
                    indentNo: sheet.indentNumber,
                    firmNameMatch: sheet.firmNameMatch || '',
                    product: sheet.productName,
                    quantity: sheet.pendingPoQty,
                    rate: sheet.approvedRate,
                    uom: sheet.uom,
                    vendorName: sheet.approvedVendorName,
                    paymentTerm: sheet.approvedPaymentTerm,
                    specifications: sheet.specifications || '',
                }))
                // Sort by indentNo in descending order
                .sort((a, b) => b.indentNo.localeCompare(a.indentNo))
        );
    }, [indentSheet, user.firmNameMatch]);

  const handlePoRequired = async (response: 'Yes' | 'No') => {
    if (!selectedIndent) return;

    setIsSubmitting(true);

    try {
        // Find the matching row from indentSheet
        const matchingRow = indentSheet.find(
            sheet => sheet.indentNumber === selectedIndent.indentNo
        );

        if (!matchingRow) {
            toast.error('Indent not found');
            setIsSubmitting(false);
            return;
        }

        // Create updated row with ONLY poRequred field (note the spelling)
        const updatedRow = {
            rowIndex: matchingRow.rowIndex,
            sheetName: 'INDENT',
            poRequred: response, // Column BT - "Po Requred" becomes "poRequred" in camelCase
        };

        console.log('Updating row:', updatedRow);

        const result = await postToSheet([updatedRow], 'update', 'INDENT');
        
        if (result && result.success) {
            toast.success(`PO Required status updated to ${response}`);
            setOpenDialog(false);
            setSelectedIndent(null);
            
            // Refresh the indent sheet after 1 second
            setTimeout(() => {
                updateIndentSheet();
            }, 1000);
        } else {
            toast.error('Failed to update PO Required status');
        }
    } catch (error) {
        console.error('Error updating PO Required:', error);
        toast.error('Failed to update PO Required status');
    } finally {
        setIsSubmitting(false);
    }
};
    // Creating table columns with compact Product column
    const columns: ColumnDef<PendingIndentsData>[] = [
        {
            header: 'Action',
            cell: ({ row }: { row: any }) => {
                const indent = row.original;
                return (
                    <div>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSelectedIndent(indent);
                                    setOpenDialog(true);
                                }}
                            >
                                PO Required
                            </Button>
                        </DialogTrigger>
                    </div>
                );
            },
        },
        {
            accessorKey: 'date',
            header: 'Date',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string}</div>
        },
        {
            accessorKey: 'indentNo',
            header: 'Indent Number',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string}</div>
        },
        {
            accessorKey: 'firmNameMatch',
            header: 'Firm Name',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string}</div>
        },
        {
            accessorKey: 'product',
            header: 'Product',
            cell: ({ getValue }) => (
                <div className="max-w-[120px] break-words whitespace-normal px-1 text-sm">
                    {getValue() as string}
                </div>
            ),
        },
        {
            accessorKey: 'quantity',
            header: 'Pending PO Qty',
            cell: ({ getValue }) => <div className="px-2">{getValue() as number}</div>
        },
        {
            accessorKey: 'rate',
            header: 'Rate',
            cell: ({ row }) => (
                <div className="px-2">
                    &#8377;{row.original.rate}
                </div>
            ),
        },
        {
            accessorKey: 'uom',
            header: 'UOM',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string}</div>
        },
        {
            accessorKey: 'vendorName',
            header: 'Vendor Name',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string}</div>
        },
        {
            accessorKey: 'paymentTerm',
            header: 'Payment Term',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string}</div>
        },
        {
            accessorKey: 'specifications',
            header: 'Specifications',
            cell: ({ getValue }) => (
                <div className="max-w-[150px] break-words whitespace-normal px-2 text-sm">
                    {getValue() as string}
                </div>
            ),
        },
    ];

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Heading heading="Pending POs" subtext="View pending purchase orders">
                    <ListTodo size={50} className="text-primary" />
                </Heading>
                <DataTable
                    data={tableData}
                    columns={columns}
                    searchFields={['product', 'vendorName', 'paymentTerm', 'specifications','firmNameMatch']}
                    dataLoading={indentLoading}
                    className="h-[80dvh]"
                />

                {selectedIndent && (
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>PO Required Confirmation</DialogTitle>
                            <DialogDescription>
                                Please confirm PO requirement for this indent
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-3 bg-muted py-3 px-4 rounded-md">
                            <div className="space-y-1">
                                <p className="font-medium text-sm">Indent Number</p>
                                <p className="text-sm font-light">{selectedIndent.indentNo}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium text-sm">Firm Name</p>
                                <p className="text-sm font-light">{selectedIndent.firmNameMatch}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium text-sm">Vendor Name</p>
                                <p className="text-sm font-light">{selectedIndent.vendorName}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium text-sm">Product</p>
                                <p className="text-sm font-light">{selectedIndent.product}</p>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button variant="outline" disabled={isSubmitting}>
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button 
                                variant="destructive"
                                onClick={() => handlePoRequired('No')}
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader size={16} color="white" className="mr-2" />}
                                No
                            </Button>
                            <Button 
                                variant="default"
                                onClick={() => handlePoRequired('Yes')}
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader size={16} color="white" className="mr-2" />}
                                Yes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
};