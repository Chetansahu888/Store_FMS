
import { Package2 } from 'lucide-react';
import Heading from '../element/Heading';
import { useSheets } from '@/context/SheetsContext';
import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { Pill } from '../ui/pill';
import type { PcReportSheet } from '@/types';

export default function PcReportTable() {
    const { pcReportSheet, poMasterLoading } = useSheets(); // Assuming pcReportLoading is same as poMasterLoading
    const [historyData, setHistoryData] = useState<PcReportSheet[]>([]);

    // Update table data whenever pcReportSheet changes
    useEffect(() => {
        console.log("PC Report Sheet:", pcReportSheet);
        setHistoryData(pcReportSheet);
    }, [pcReportSheet]);


    // Columns for PcReportSheet
    const historyColumns: ColumnDef<PcReportSheet>[] = [
        { accessorKey: 'stage', header: 'Stage' },
        { accessorKey: 'firmName', header: 'Firm Name' },
        { accessorKey: 'totalPending', header: 'Total Pending' },
        { accessorKey: 'totalComplete', header: 'Total Complete' },
    ];



    return (
        <div>
            <Heading heading="PC Report" subtext="">
                <Package2 size={50} className="text-primary" />
            </Heading>

            <DataTable
    data={historyData}
    columns={historyColumns}
    searchFields={['stage', 'firmName', 'totalPending', 'totalComplete']}  // All columns
    dataLoading={poMasterLoading}
    className='h-[80dvh]'
/>
        </div>
    );
}
