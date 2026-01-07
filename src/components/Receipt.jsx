import React from 'react';
import { numberToWords } from '../utils/numberToWords';

const Receipt = ({ data }) => {
    if (!data) return null;

    const {
        receiptNumber,
        date,
        amount,
        payerName,
        installmentNumber,
        paymentMethod // 'transfer' or 'cash'
    } = data;

    const amountText = numberToWords(amount);

    return (
        <div id="receipt-print" style={{
            width: '800px',
            fontFamily: 'Arial, sans-serif',
            border: '2px solid black',
            margin: '20px auto',
            backgroundColor: 'white',
            color: 'black'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', borderBottom: '2px solid black' }}>
                <div style={{ flex: 1, padding: '10px' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', color: '#5D4037' }}>RECIBO</h1>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>FECHA: {new Date(date).toLocaleDateString()}</p>
                </div>
                <div style={{ width: '250px' }}>
                    <div style={{
                        backgroundColor: '#FDD835',
                        padding: '5px',
                        textAlign: 'center',
                        borderBottom: '2px solid black',
                        borderLeft: '2px solid black',
                        fontWeight: 'bold'
                    }}>
                        N° {String(receiptNumber).padStart(8, '0')}
                    </div>
                    <div style={{ height: '40px', borderLeft: '2px solid black' }}></div>
                </div>
            </div>

            {/* Amount Row */}
            <div style={{ display: 'flex', borderBottom: '2px solid black' }}>
                <div style={{ flex: 1, padding: '5px 10px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '5px', fontStyle: 'italic' }}>Cantidad recibida:</span>
                    <span style={{ textTransform: 'uppercase' }}>{amountText}</span>
                </div>
                <div style={{
                    width: '250px',
                    backgroundColor: '#FDD835',
                    padding: '5px',
                    textAlign: 'center',
                    borderLeft: '2px solid black',
                    fontWeight: 'bold',
                    fontSize: '18px'
                }}>
                    $ {amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </div>
            </div>

            {/* Payment Details */}
            <div style={{ padding: '5px 10px', borderBottom: '2px solid black' }}>
                <span style={{ fontWeight: 'bold', fontStyle: 'italic' }}>Pago:</span> CUOTA {installmentNumber}
            </div>

            {/* Payer */}
            <div style={{ borderBottom: '2px solid black' }}>
                <div style={{ padding: '5px 10px', borderBottom: '1px solid black' }}>
                    <span style={{ fontWeight: 'bold', fontStyle: 'italic' }}>Recibido de:</span> {payerName}
                </div>
                <div style={{ padding: '5px 10px', textAlign: 'center', fontWeight: 'bold', color: '#5D4037' }}>
                    PAGADO
                </div>
            </div>

            {/* Footer / Payment Method */}
            <div style={{ padding: '10px', position: 'relative' }}>
                <div style={{ fontWeight: 'bold', fontStyle: 'italic', marginBottom: '10px' }}>Forma de Pago:</div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold', color: '#5D4037' }}>TRANSFERENCIA</span>
                        <div style={{
                            width: '30px',
                            height: '15px',
                            borderRadius: '50%',
                            backgroundColor: paymentMethod === 'transfer' ? 'black' : 'transparent',
                            border: '2px solid black'
                        }}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold', color: '#5D4037' }}>EFECTIVO</span>
                        <div style={{
                            width: '30px',
                            height: '15px',
                            borderRadius: '50%',
                            backgroundColor: paymentMethod === 'cash' ? 'black' : 'transparent',
                            border: '2px solid black'
                        }}></div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                    GRACIAS POR SU PAGO!!!
                </div>
            </div>
        </div>
    );
};

export default Receipt;
